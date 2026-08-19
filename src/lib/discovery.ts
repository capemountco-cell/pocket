import { supabase, type SiteRow } from "@/integrations/supabase/client";

// The app's whole view of the backend. Every call the UI makes goes through
// one of these functions, so the sheets and the discovery screen never learn
// which table, function or column anything lives in -- and a schema change
// stays inside this file.

// What a screen actually needs to render one site. Deliberately narrower than
// the database row: ranking, moderation and billing columns are the feed's
// business, not the card's.
export type DiscoverySite = {
  id: string;
  title: string;
  domain: string;
  url: string;
  blurb: string;
  tag: string;
  // Whether to attempt framing this origin. Only a measured `false` -- the
  // origin's own X-Frame-Options / CSP saying no -- rules it out. Most of the
  // catalogue has never been probed, and refusing to embed everything
  // unmeasured would turn the product into a wall of preview cards; SiteViewer
  // already falls back to one when a frame doesn't load in time.
  embeddable: boolean;
};

// The reaction vocabulary the UI speaks. Each maps onto a different write in
// the database, which is exactly why callers get to stay ignorant of it.
export type ReactionKind = "like" | "not_for_me" | "hidden" | "report";

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function toDiscoverySite(row: SiteRow): DiscoverySite {
  const url = row.final_url ?? row.url;
  const domain = domainOf(url);
  return {
    id: row.id,
    // Part of the catalogue was imported with the address as the title. A
    // domain reads better than a raw URL wrapped across three lines, so a
    // title that is just a link is treated as no title at all.
    title: pickTitle(row.title, row.og_title, domain),
    domain,
    url,
    blurb: row.description ?? row.og_description ?? "",
    tag: row.category ?? "Site",
    // Respect a measured refusal; try everything else. See the note on the
    // field above -- most rows have never been probed.
    embeddable: row.embeddable !== false,
  };
}

function pickTitle(...candidates: (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) return trimmed;
  }
  // The domain is the last candidate and is always a usable name.
  return candidates[candidates.length - 1]?.trim() || "Untitled";
}

/**
 * One serve of candidates for this device, already filtered server-side for
 * anything it disliked, blocked or has seen.
 *
 * With a small catalogue a device exhausts the unseen set quickly. An empty
 * queue is therefore a normal state, not an error: the caller is told so and
 * can offer to start the catalogue over.
 */
export async function fetchQueue(deviceId: string, limit = 25): Promise<DiscoverySite[]> {
  const { data, error } = await supabase.rpc("get_discovery_queue", {
    p_device_id: deviceId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map(toDiscoverySite);
}

/** Clears this device's served history so the catalogue can come round again. */
export async function resetHistory(deviceId: string): Promise<void> {
  const { error } = await supabase.rpc("reset_discovery_history", { p_device_id: deviceId });
  if (error) throw error;
}

/** Marks a site as served so the queue stops offering it. */
export async function recordServe(deviceId: string, siteId: string): Promise<void> {
  await supabase.rpc("record_discovery", { p_device_id: deviceId, p_site_id: siteId });
}

/**
 * Write a reaction. `like` toggles server-side — reacting the same way twice
 * clears it — and the three negative kinds each also take the site out of this
 * device's rotation.
 *
 * @returns the reaction the site carries afterwards, or null if it was cleared.
 */
export async function writeReaction(
  deviceId: string,
  siteId: string,
  kind: ReactionKind,
): Promise<ReactionKind | null> {
  if (kind === "like") {
    const { data, error } = await supabase.rpc("record_interaction", {
      p_device_id: deviceId,
      p_site_id: siteId,
      p_action: "like",
    });
    if (error) throw error;
    return data?.[0]?.state === "like" ? "like" : null;
  }

  const downvoteKind = kind === "not_for_me" ? "not_for_me" : kind === "hidden" ? "block" : "spam";
  const { error } = await supabase.rpc("record_downvote", {
    p_device_id: deviceId,
    p_site_id: siteId,
    p_kind: downvoteKind,
  });
  if (error) throw error;
  return kind;
}

/** Every reaction this device has recorded, as the UI's own vocabulary. */
export async function fetchReactions(deviceId: string): Promise<Record<string, ReactionKind>> {
  const { data, error } = await supabase.rpc("get_my_interactions", { p_device_id: deviceId });
  if (error) throw error;

  const out: Record<string, ReactionKind> = {};
  for (const row of data ?? []) {
    // The store keeps one action per site, so a dislike reads back as
    // "not for me" -- the finer negative kinds (blocked, reported) are
    // recorded alongside it and change the feed rather than the icon.
    if (row.site_id) out[row.site_id] = row.action === "like" ? "like" : "not_for_me";
  }
  return out;
}

/** @returns whether the site is saved *after* the toggle. */
export async function toggleSaved(deviceId: string, siteId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_save", {
    p_device_id: deviceId,
    p_site_id: siteId,
  });
  if (error) throw error;
  return data === true;
}

export async function fetchSavedIds(deviceId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_my_saved_ids", { p_device_id: deviceId });
  if (error) throw error;
  return (data ?? []).map((row) => row.site_id).filter((id): id is string => Boolean(id));
}

export async function fetchSavedSites(deviceId: string): Promise<DiscoverySite[]> {
  const { data, error } = await supabase.rpc("get_my_saved_sites", {
    p_device_id: deviceId,
    p_from: 0,
    p_limit: 100,
  });
  if (error) throw error;
  return (data ?? []).map(toDiscoverySite);
}

/**
 * Analytics. Fire-and-forget by contract: an event that fails to record must
 * never surface in the UI or block the interaction that produced it.
 */
export function recordEvent(deviceId: string, kind: EventKind, siteId?: string): void {
  void supabase
    .rpc("record_event", {
      p_device_id: deviceId,
      p_kind: kind,
      ...(siteId ? { p_site_id: siteId } : {}),
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

// A closed union rather than free strings, so a renamed event fails to
// compile instead of quietly splitting one metric into two.
//
// IMPORTANT: record_event() drops any kind not on its own allowlist, silently
// and by design. Adding a name here without adding it there means the event
// never lands, and nothing complains. Both sides change together — see
// supabase/migrations/20260819_extend_event_allowlist.sql.
//
// Names already in use by the database are reused rather than aliased: this
// app's "menu" event is the existing `menu_open`, not a second name for the
// same thing.
export type EventKind =
  | "menu_open"
  | "react_open"
  | "sendto_open"
  | "submit_open"
  | "submit_success"
  | "preferences_open"
  | "bookmarks_open"
  | "share"
  | "copy_link"
  | "open_site"
  | "catalogue_restart"
  | "auth_open"
  | "auth_instant_created"
  | "auth_instant_claimed"
  | "auth_instant_signin"
  | "auth_wrong_password"
  | "auth_magic_sent"
  | "auth_signed_out"
  | "auth_error";

// One event name per nav slot. Declared here beside the union so adding a
// slot forces a decision about what it is called in analytics, instead of a
// cast quietly inventing a name at the call site.
//
// `discover` has no entry: every serve already writes a `stumble` event
// inside record_discovery, and a second event for the same tap would double
// count it.
export const NAV_SLOT_EVENT = {
  menu: "menu_open",
  react: "react_open",
  "send-to": "sendto_open",
  submit: "submit_open",
} as const satisfies Partial<Record<string, EventKind>>;

export type SubmitResult = { ok: true; queued: true } | { ok: false; reason: string };

/**
 * Hand a URL to the submission queue. It is reviewed before it can be served
 * to anyone, so the honest answer here is "received", never "published".
 */
export async function submitSite(
  deviceId: string,
  url: string,
  probe: { embeddable: boolean; title: string },
): Promise<SubmitResult> {
  const { error } = await supabase.from("submissions").insert({
    url,
    device_id: deviceId,
    title: probe.title,
    is_embeddable: probe.embeddable,
  });
  if (error) return { ok: false, reason: "That submission couldn't be saved just now." };
  return { ok: true, queued: true };
}
