import { supabase } from "@/integrations/supabase/client";
import { APP_DOMAIN } from "@/lib/brand";

/**
 * The auction.
 *
 * Placement on the board is bought outright: whatever a site pays is its
 * position, highest first. There are no packages and no impression counts to
 * reason about -- the number beside a row is the money behind it, and the way
 * past it is to pay more. That is the whole mechanic, and it is legible at a
 * glance in a way "600 impressions for $15" never was.
 *
 * The ranking is computed server-side by get_bid_board, because the amounts
 * live in an orders table that RLS gives a browser no access to at all -- the
 * function is SECURITY DEFINER and returns only what a board needs to show.
 */

export type Bid = {
  id: string;
  url: string;
  /** Derived here so every consumer of a bid shows the same name for it. */
  domain: string;
  title: string | null;
  description: string | null;
  image: string | null;
  /** Resolved icon address, or null when the catalogue found none. */
  icon: string | null;
  /** Adult. Priced rather than refused, and marked wherever it appears. */
  adult: boolean;
  amountCents: number;
  rank: number;
  placedAt: string | null;
};

export type BidBoard = {
  /** The floor. Nothing below this gets on the board at all. */
  minCents: number;
  /** The current leader's bid, or 0 when nobody holds the top. */
  topCents: number;
  bids: Bid[];
};

/**
 * What it costs to take first place right now.
 *
 * One step over the leader, or the floor when the board is empty -- so an
 * empty auction opens at the minimum rather than at nothing, and the headline
 * never reads "Claim #1 for $0".
 */
export const BID_STEP_CENTS = 100;

export function claimTopCents(board: BidBoard): number {
  return Math.max(board.minCents, board.topCents + BID_STEP_CENTS);
}

/** Whole dollars, grouped. A bid is a headline number, not an invoice. */
export function money(cents: number): string {
  const dollars = cents / 100;
  return (
    "$" +
    (Number.isInteger(dollars)
      ? dollars.toLocaleString()
      : dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  );
}

/**
 * `get_bid_board` is newer than the checked-in generated types, and that file
 * says not to hand-edit it -- so the one call it does not know about is typed
 * here instead of forged in there. This narrowing disappears the next time the
 * types are regenerated against the database.
 */
type BidBoardRpc = {
  rpc(fn: "get_bid_board"): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function fetchBidBoard(): Promise<BidBoard> {
  const { data, error } = await (supabase as unknown as BidBoardRpc).rpc("get_bid_board");
  if (error) throw new Error(error.message);
  const raw = (data ?? {}) as {
    min_cents?: number;
    top_cents?: number;
    bids?: Array<Record<string, unknown>>;
  };
  const bids: Bid[] = (raw.bids ?? []).map((b) => ({
    id: String(b["id"] ?? ""),
    url: String(b["url"] ?? ""),
    domain: domainOf(String(b["url"] ?? "")),
    title: typeof b["title"] === "string" ? (b["title"] as string) : null,
    description: typeof b["description"] === "string" ? (b["description"] as string) : null,
    image: typeof b["image"] === "string" ? (b["image"] as string) : null,
    icon: typeof b["favicon_url"] === "string" ? (b["favicon_url"] as string) : null,
    adult: b["is_adult"] === true,
    amountCents: Number(b["amount_cents"] ?? 0),
    rank: Number(b["rank"] ?? 0),
    placedAt: typeof b["placed_at"] === "string" ? (b["placed_at"] as string) : null,
  }));
  return {
    minCents: Number(raw.min_cents ?? 500),
    topCents: Number(raw.top_cents ?? 0),
    bids,
  };
}

export type BidStart = { ok: true; url: string } | { ok: false; message: string };

/**
 * Hands off to Stripe for a bid of any amount.
 *
 * The origin is sent so the buyer comes back here rather than to whichever
 * front end the function was written for first; the function still checks it
 * against its own allowlist, so this is a preference, not an instruction.
 */
export async function startBid(
  url: string,
  amountCents: number,
  deviceId: string,
): Promise<BidStart> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      url?: string;
      message?: string;
    }>("create-boost-checkout", {
      body: {
        url,
        device_id: deviceId,
        custom_amount_cents: amountCents,
        origin: typeof window !== "undefined" ? window.location.origin : `https://${APP_DOMAIN}`,
      },
    });
    if (error) return { ok: false, message: "Couldn't reach checkout just now." };
    if (!data?.ok || !data.url) {
      return { ok: false, message: data?.message ?? "Couldn't start that bid." };
    }
    return { ok: true, url: data.url };
  } catch {
    return { ok: false, message: "Couldn't reach checkout just now." };
  }
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
