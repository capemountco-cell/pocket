import { supabase } from "@/integrations/supabase/client";
import { fetchBidBoard, type Bid, type BidBoard } from "@/lib/bids";
import { toDiscoverySite, type DiscoverySite } from "@/lib/discovery";
import type { SiteRow } from "@/integrations/supabase/client";

/**
 * What Explore shows, and the order it shows it in.
 *
 * Two rankings stacked, not blended. Paid bids hold the top of the board in
 * the order they paid; everything earned falls in underneath. That is the
 * whole proposition of the auction -- a bid displaces the sites above it, and
 * they slide down rather than keeping a spot money has been paid for. Each row
 * still carries its price, which is a plainer disclosure than any "Ad" chip:
 * it says the placement was bought AND what it took to buy.
 *
 * "Earned" is a combination rather than a single column, because every single
 * column is wrong on its own here. Ordering by likes alone puts a site with
 * one like above one with sixty likes and five dislikes. Ordering by ratio
 * alone puts a 1/0 site at the top of everything. Ordering by date alone is
 * not a ranking at all.
 *
 * The shape of the catalogue forces the rest: of 2,065 live sites only 260
 * carry any reaction at all, so a score that requires engagement would leave
 * the page nearly empty. Unreacted sites therefore score a neutral middle and
 * sort under anything that has actually earned its place, rather than being
 * excluded.
 */

/** Positions on one page of the board. */
export const PAGE_SIZE = 100;

/** How deep the board goes: ten pages of a hundred. */
export const BOARD_DEPTH = 1000;

export const PAGE_COUNT = BOARD_DEPTH / PAGE_SIZE;

export type ExploreSite = DiscoverySite & {
  description: string | null;
  image: string | null;
  tags: string[];
  likes: number;
  score: number;
};

/**
 * Where the ranking is computed, and why it is not computed here.
 *
 * A thousand-deep board cannot be ranked in the browser. PostgREST caps a
 * response at 1,000 rows, so covering 2,065 live sites took three requests and
 * about 310 KB gzipped -- the entire catalogue shipped to a phone to decide an
 * order it then throws most of away. `get_explore_board` does the same
 * arithmetic in SQL and returns one page, which is a single request of roughly
 * 20 KB however deep the reader goes.
 *
 * The formula it applies, kept here because the repo should say what the
 * database does:
 *
 *   approval = (likes + 1) / (likes + dislikes + 2)
 *   weight   = ln(1 + likes + dislikes)
 *   fresh    = 1 + 0.35 * exp(-ageDays / 90)
 *   score    = approval * (0.35 + weight) * fresh - spamReports * 0.5
 *
 * approval  Laplace-smoothed, so 1 like and no dislikes reads as 0.67 rather
 *           than a perfect 1.0 and cannot outrank 60 likes against 16.
 * weight    grows with the log of total reactions: the difference between 2
 *           and 20 matters, between 200 and 220 much less.
 * fresh     a mild lift over roughly three months, so the page can change
 *           without recency being able to overturn a strong record.
 * spam      reports subtract directly. Three is enough to bury anything.
 *
 * Multiplied, not added, so a site has to do acceptably on all three rather
 * than winning on one. Ties break on id, without which offset paging would
 * repeat and skip rows between pages.
 *
 * There is deliberately no second copy of this in TypeScript. One ranking with
 * two implementations is one ranking that drifts.
 */
type ExploreRpc = {
  rpc(
    fn: "get_explore_board",
    args: { p_limit: number; p_offset: number },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/** A place on the board: a bought position, or an earned one. */
export type BoardEntry =
  { kind: "bid"; rank: number; bid: Bid } | { kind: "earned"; rank: number; site: ExploreSite };

/** One page of positions, already numbered from the top of the whole board. */
export type BoardSlice = { page: number; entries: BoardEntry[] };

export type ExploreBoard = {
  /** The auction, in full. Small: bids are counted in tens, not thousands. */
  board: BidBoard;
  /** Positions the board actually has, capped at BOARD_DEPTH. */
  depth: number;
  /** Pages loaded so far, contiguous and in order. */
  slices: BoardSlice[];
};

export function pageCount(depth: number): number {
  return Math.max(1, Math.min(PAGE_COUNT, Math.ceil(depth / PAGE_SIZE)));
}

/**
 * The first page, plus the shape of everything under it.
 *
 * The auction and the first hundred earned rows are fetched together rather
 * than in sequence. Page one always starts at earned-offset zero whatever the
 * auction turns out to hold, so the second request does not have to wait on
 * the first to know what to ask for -- a full page is requested and the tail
 * trimmed off if bids took some of the slots.
 */
export async function fetchExploreBoard(): Promise<ExploreBoard> {
  const [board, first] = await Promise.all([fetchBidBoard(), fetchEarned(0, PAGE_SIZE)]);
  const paid = paidCount(board);
  const depth = Math.min(BOARD_DEPTH, paid + first.total);
  return { board, depth, slices: [sliceOf(0, board, depth, first.sites)] };
}

/** A later page. The auction is already known, so its offset is exact. */
export async function fetchBoardPage(
  page: number,
  board: BidBoard,
  depth: number,
): Promise<BoardSlice> {
  const { earnedSlots, earnedOffset } = layout(page, board, depth);
  const earned = earnedSlots > 0 ? await fetchEarned(earnedOffset, earnedSlots) : { sites: [] };
  return sliceOf(page, board, depth, earned.sites);
}

/**
 * How one page divides between bought and earned.
 *
 * Bids hold positions 1..B outright, so a page is some tail of the auction
 * followed by earned rows starting wherever the auction ran out. In practice B
 * is small and every bid lands on page one, but the arithmetic does not assume
 * that -- a hundred bidders should push the first earned row onto page two,
 * which is exactly what the auction promises them.
 */
function layout(
  page: number,
  board: BidBoard,
  depth: number,
): { start: number; bidSlots: number; earnedSlots: number; earnedOffset: number } {
  const paid = paidCount(board);
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, depth);
  const slots = Math.max(0, end - start);
  const bidSlots = Math.max(0, Math.min(paid - start, slots));
  return {
    start,
    bidSlots,
    earnedSlots: slots - bidSlots,
    earnedOffset: Math.max(0, start - paid),
  };
}

function paidCount(board: BidBoard): number {
  return Math.min(board.bids.length, BOARD_DEPTH);
}

/** Numbers a page's rows from the top of the board rather than from the page. */
function sliceOf(page: number, board: BidBoard, depth: number, earned: ExploreSite[]): BoardSlice {
  const { start, bidSlots, earnedSlots } = layout(page, board, depth);
  const bids = [...board.bids].sort((a, b) => a.rank - b.rank);
  const entries: BoardEntry[] = [];

  for (let i = 0; i < bidSlots; i += 1) {
    const bid = bids[start + i];
    if (bid) entries.push({ kind: "bid", rank: start + i + 1, bid });
  }
  // Trimmed rather than assumed: page one asks for a full hundred before it
  // knows how many slots the auction took, and a short tail is possible at the
  // end of the catalogue.
  for (let i = 0; i < Math.min(earnedSlots, earned.length); i += 1) {
    const site = earned[i];
    if (site) entries.push({ kind: "earned", rank: start + bidSlots + i + 1, site });
  }

  return { page, entries };
}

/** One page of the earned ranking, straight from the database. */
async function fetchEarned(
  offset: number,
  limit: number,
): Promise<{ total: number; sites: ExploreSite[] }> {
  const { data, error } = await (supabase as unknown as ExploreRpc).rpc("get_explore_board", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);

  const raw = (data ?? {}) as { total?: number; sites?: Array<Record<string, unknown>> };
  return {
    total: Number(raw.total ?? 0),
    sites: (raw.sites ?? []).map(decorate),
  };
}

/** A catalogue row as the page needs it. */
function decorate(row: Record<string, unknown>): ExploreSite {
  const tags = row["tags"];
  return {
    ...toDiscoverySite(row as unknown as SiteRow),
    description: typeof row["description"] === "string" ? (row["description"] as string) : null,
    image: typeof row["og_image"] === "string" ? (row["og_image"] as string) : null,
    tags: Array.isArray(tags) ? tags.filter((t): t is string => Boolean(t)).slice(0, 3) : [],
    likes: Math.max(0, Number(row["like_count"] ?? 0)),
    score: Number(row["score"] ?? 0),
  };
}
