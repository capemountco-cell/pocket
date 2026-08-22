import { supabase, type SiteRow } from "@/integrations/supabase/client";
import type { SubmissionDestination } from "@/lib/submission-routing";

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
  // Where the site's icon lives, or null when it has none. Null is an answer,
  // not a gap: the icon services reply to a miss with a decodable grey
  // placeholder, which a browser reports as a successful load, so nothing in
  // the client can tell a real icon from a blank one. The catalogue resolves
  // it once, server-side, and a row with null here draws its letter straight
  // away instead of fetching a picture of nothing.
  icon: string | null;
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
    icon: row.favicon_url ?? null,
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

/**
 * One site by id, for arriving at a specific site rather than a random one.
 *
 * Reads the table directly: RLS already lets anon select live sites, so this
 * needs no function of its own.
 */
export async function fetchSiteById(id: string): Promise<DiscoverySite | null> {
  const { data, error } = await supabase.from("sites").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toDiscoverySite(data);
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

export async function fetchSavedSites(
  deviceId: string,
  from = 0,
  limit = 100,
): Promise<DiscoverySite[]> {
  const { data, error } = await supabase.rpc("get_my_saved_sites", {
    p_device_id: deviceId,
    p_from: from,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map(toDiscoverySite);
}

/** Empty this device's collection in one call. */
export async function clearSaved(deviceId: string): Promise<void> {
  const { error } = await supabase.rpc("clear_saved_sites", { p_device_id: deviceId });
  if (error) throw error;
}

/**
 * What this device has submitted, newest first.
 *
 * The RPC hands back loosely-typed JSON, so the shape is narrowed here rather
 * than at every call site -- and anything the function grows later is ignored
 * until a screen actually asks for it.
 */
export type MySubmission = {
  id: string;
  url: string;
  title: string | null;
  verdict: string | null;
  createdAt: string | null;
};

export async function fetchMySubmissions(deviceId: string): Promise<MySubmission[]> {
  const { data, error } = await supabase.rpc("get_my_submissions", { p_device_id: deviceId });
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return rows.flatMap((row) => {
    if (typeof row !== "object" || row === null) return [];
    const r = row as Record<string, unknown>;
    const id = typeof r["id"] === "string" ? r["id"] : null;
    const url = typeof r["url"] === "string" ? r["url"] : null;
    if (!id || !url) return [];
    return [
      {
        id,
        url,
        title: typeof r["title"] === "string" ? r["title"] : null,
        verdict: typeof r["verdict"] === "string" ? r["verdict"] : null,
        createdAt: typeof r["created_at"] === "string" ? r["created_at"] : null,
      },
    ];
  });
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
  | "bookmarks_export"
  | "bookmarks_clear"
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

export type SubmitResult =
  | {
      ok: true;
      queued: true;
      /** What the classifier decided the link is, which drives what is shown. */
      destination: SubmissionDestination;
      /** "auto" publishes clean links; "review" queues everything for a human. */
      moderationStatus?: string | undefined;
    }
  | { ok: false; reason: string };

/**
 * Hand a URL to the submission queue. It is reviewed before it can be served
 * to anyone, so the honest answer here is "received", never "published".
 */
/**
 * Hand a link to the classifier and get back where it belongs.
 *
 * This used to be a bare insert into `submissions` from the browser, which
 * meant every link arrived unclassified: no destination, no reason, no
 * moderation status, and no way for anything to be flagged or sent to the
 * boost path. The judging has always lived in the classify-submission edge
 * function -- it normalises the URL, refuses unsafe ones, measures
 * embeddability, asks Grok what the page actually is, checks it against the
 * banned list and the auto/review setting, and only then writes the row. The
 * insert here was going around all of it.
 *
 * So the function is the only way in now. It writes the row itself, which is
 * why nothing is inserted on this side.
 */
export async function submitSite(
  deviceId: string,
  url: string,
  userId?: string | undefined,
): Promise<SubmitResult> {
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    error?: string;
    destination?: SubmissionDestination;
    moderation_status?: string;
  }>("classify-submission", {
    body: { url, device_id: deviceId, ...(userId ? { submitted_by: userId } : {}) },
  });

  if (error) return { ok: false, reason: "That submission couldn't be checked just now." };

  // The function answers 200 with ok:false for a link it understood and
  // refused, so the failure cases are read from the body rather than the
  // status.
  if (!data?.ok) {
    const reason =
      data?.error === "invalid_url"
        ? "That doesn't look like a public web address."
        : data?.error === "missing_url"
          ? "Enter an address first."
          : "That submission couldn't be checked just now.";
    return { ok: false, reason };
  }

  return {
    ok: true,
    queued: true,
    destination: data.destination ?? "none",
    ...(data.moderation_status ? { moderationStatus: data.moderation_status } : {}),
  };
}
