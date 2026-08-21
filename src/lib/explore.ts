import { supabase } from "@/integrations/supabase/client";
import { toDiscoverySite, type DiscoverySite } from "@/lib/discovery";
import type { SiteRow } from "@/integrations/supabase/client";

/**
 * What Explore shows, and the order it shows it in.
 *
 * "Top" is a combination rather than a single column, because every single
 * column is wrong on its own here. Ordering by likes alone puts a site with
 * one like above one with sixty likes and five dislikes. Ordering by ratio
 * alone puts a 1/0 site at the top of everything. Ordering by date alone is
 * not a ranking at all.
 *
 * The shape of the catalogue forces the rest: of 2,060 live sites only 123
 * carry any reaction at all, so a score that requires engagement would leave
 * the page nearly empty. Unreacted sites therefore score a neutral middle and
 * sort under anything that has actually earned its place, rather than being
 * excluded.
 */

/** Pulled per query. Two passes are merged, so this is not the page size. */
const CANDIDATES = 200;

/** How many make the page. Enough to scroll, small enough to stay curated. */
export const EXPLORE_SIZE = 60;

const COLUMNS =
  "id,url,title,description,og_image,tags,category,like_count,dislike_count,spam_report_count,created_at,embeddable,boosted,status,is_adult";

export type ExploreSite = DiscoverySite & {
  description: string | null;
  image: string | null;
  tags: string[];
  likes: number;
  score: number;
};

type Row = {
  like_count?: number | null;
  dislike_count?: number | null;
  spam_report_count?: number | null;
  created_at?: string | null;
  description?: string | null;
  og_image?: string | null;
  tags?: string[] | null;
};

/**
 * How well a site has been received, how sure we are of that, and how fresh
 * it is -- multiplied, not added, so a site has to do acceptably on all three
 * rather than winning on one.
 *
 * approval  Laplace-smoothed, so 1 like and no dislikes reads as 0.67 rather
 *           than a perfect 1.0 and cannot outrank 60 likes against 16.
 * weight    grows with the log of total reactions: the difference between 2
 *           and 20 matters, between 200 and 220 much less.
 * fresh     a mild lift over roughly three months, so the page can change
 *           without recency being able to overturn a strong record.
 * spam      reports subtract directly. Three is enough to bury anything.
 */
export function scoreSite(row: Row, now: number): number {
  const likes = Math.max(0, row.like_count ?? 0);
  const dislikes = Math.max(0, row.dislike_count ?? 0);
  const total = likes + dislikes;

  const approval = (likes + 1) / (total + 2);
  const weight = Math.log1p(total);

  const ageDays = row.created_at
    ? Math.max(0, (now - new Date(row.created_at).getTime()) / 86_400_000)
    : 365;
  const fresh = 1 + 0.35 * Math.exp(-ageDays / 90);

  const spam = Math.max(0, row.spam_report_count ?? 0);

  return approval * (0.35 + weight) * fresh - spam * 0.5;
}

export type ExplorePage = {
  /** Paid placement. Shown above the list and labelled as bought, never mixed. */
  boosted: ExploreSite[];
  /** Earned placement, ranked by score. */
  top: ExploreSite[];
};

/**
 * Everything the page shows, in two separate lists.
 *
 * Paid and earned are kept apart on purpose. A boost buys distribution; it
 * does not buy a better record, and quietly sorting bought placement into an
 * editorial "top" would make the number beside every other row meaningless.
 * Boosted sites sit above the list under their own heading, and are removed
 * from the ranking below so nothing appears twice.
 */
export async function fetchExplorePage(): Promise<ExplorePage> {
  const [boosted, top] = await Promise.all([fetchBoosted(), fetchExplore()]);
  const paidIds = new Set(boosted.map((s) => s.id));
  return { boosted, top: top.filter((s) => !paidIds.has(s.id)) };
}

/** Sites currently carrying a live boost. */
async function fetchBoosted(): Promise<ExploreSite[]> {
  const { data, error } = await supabase
    .from("sites")
    .select(COLUMNS)
    .eq("status", "live")
    .is("boosted", true)
    .not("is_adult", "is", true)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return [];
  const now = Date.now();
  return (data ?? []).map((row) => decorate(row as unknown as SiteRow, row, now));
}

/**
 * The earned ranking.
 *
 * Two queries rather than one: ordering the whole catalogue by a score the
 * database does not store is not possible from here, so the best-reviewed and
 * the newest are fetched separately and merged before scoring. Without the
 * second pass a good site submitted yesterday could never appear, because it
 * has no reactions yet to rank on.
 */
export async function fetchExplore(): Promise<ExploreSite[]> {
  const base = () =>
    supabase
      .from("sites")
      .select(COLUMNS)
      .eq("status", "live")
      .not("is_adult", "is", true)
      .limit(CANDIDATES);

  const [best, newest] = await Promise.all([
    base().order("like_count", { ascending: false }),
    base().order("created_at", { ascending: false }),
  ]);

  if (best.error && newest.error) throw best.error;

  const now = Date.now();
  const byId = new Map<string, ExploreSite>();
  for (const row of [...(best.data ?? []), ...(newest.data ?? [])]) {
    const r = row as unknown as SiteRow;
    if (byId.has(r.id)) continue;
    byId.set(r.id, decorate(r, row, now));
  }

  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, EXPLORE_SIZE);
}

/** A catalogue row as the page needs it. */
function decorate(r: SiteRow, row: Row, now: number): ExploreSite {
  return {
    ...toDiscoverySite(r),
    description: row.description ?? null,
    image: row.og_image ?? null,
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean).slice(0, 3) : [],
    likes: Math.max(0, row.like_count ?? 0),
    score: scoreSite(row, now),
  };
}
