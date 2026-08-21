import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

/**
 * The operator console's data layer.
 *
 * Every function here is a SECURITY DEFINER routine gated on a token, which
 * is why an operator screen can exist in a browser bundle at all: the
 * publishable key grants nothing, and the database decides what the token is
 * allowed to do. Nothing in this file can widen that.
 *
 * Two things about this backend are load-bearing and easy to get wrong:
 *
 * 1. `src/integrations/supabase/types.ts` was generated from the schema-only
 *    copy, which is AHEAD of the database this app actually talks to. Six
 *    columns it claims `sites` has -- final_url, og_title, og_description,
 *    favicon_url, embed_checked_at, embed_block_reason -- do not exist in
 *    production. Checked directly: production `sites` has 24 columns, and the
 *    list is `AdminSite` below. Reading one of the other six compiles fine and
 *    is `undefined` at runtime. That is why `AdminSite` is a Pick rather than
 *    the generated Row: the compiler now refuses the columns that aren't there.
 *
 * 2. Several routines return bare `Json` whose shape is not written down
 *    anywhere in this repo -- the migrations that created them live in the
 *    predecessor's project, not here. Rather than guess at key names and
 *    render a confident zero where the real number was under a name I made
 *    up, those come back as `Json` and the panel renders whatever keys
 *    actually arrive.
 */

type Tables = Database["public"]["Tables"];

/** The 24 columns production's `sites` really has. See note 1 above. */
export type AdminSite = Pick<
  Tables["sites"]["Row"],
  | "id"
  | "url"
  | "title"
  | "description"
  | "status"
  | "category"
  | "category_confidence"
  | "tags"
  | "secondary_categories"
  | "like_count"
  | "dislike_count"
  | "spam_report_count"
  | "is_adult"
  | "is_promotional"
  | "boosted"
  | "embeddable"
  | "og_image"
  | "mood"
  | "promo_detected_at"
  | "promo_group"
  | "promo_signals"
  | "review_flags"
  | "submitted_by_device"
  | "created_at"
>;

export type AdminSubmission = Tables["submissions"]["Row"];

export type AdminSession = { token: string; expiresAt: number };

// -- session ---------------------------------------------------------------

// sessionStorage, not localStorage. An operator token that survives closing
// the tab is a key left in the door; this one dies with the tab and is
// re-earned by typing the PIN again, which costs seconds.
const TOKEN_KEY = "app_admin_token_v1";
const POST_TOKEN_KEY = "app_admin_post_token_v1";

function readSession(key: string): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { token, expiresAt } = parsed as Partial<AdminSession>;
    if (typeof token !== "string" || typeof expiresAt !== "number") return null;
    // An expired token is not a session. Checking here rather than at the call
    // site means no screen can be built on one.
    if (expiresAt <= Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }
    return { token, expiresAt };
  } catch {
    return null;
  }
}

function writeSession(key: string, session: AdminSession | null): void {
  try {
    if (session) sessionStorage.setItem(key, JSON.stringify(session));
    else sessionStorage.removeItem(key);
  } catch {
    // A private window with storage denied gets a console that lasts one
    // screen. That is a worse experience, not a broken one.
  }
}

export const adminSession = () => readSession(TOKEN_KEY);
export const postSession = () => readSession(POST_TOKEN_KEY);
export const adminSignOut = () => writeSession(TOKEN_KEY, null);
export const postSignOut = () => writeSession(POST_TOKEN_KEY, null);

/** A stored token can be revoked server-side, so it is checked, not trusted. */
export async function adminTokenValid(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin_token_valid", { p_token: token });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Wrong PIN returns null, not an error: it is an answer, not a failure. */
export async function adminSignIn(pin: string): Promise<AdminSession | null> {
  const { data, error } = await supabase.rpc("verify_admin_pin", { p_pin: pin });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  const session = { token: row.token, expiresAt: new Date(row.expires_at).getTime() };
  writeSession(TOKEN_KEY, session);
  return session;
}

/** The message console keeps its own credential pair, so it signs in apart. */
export async function postSignIn(password: string, pin: string): Promise<AdminSession | null> {
  const { data, error } = await supabase.rpc("verify_chrnic", {
    p_password: password,
    p_pin: pin,
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  const session = { token: row.token, expiresAt: new Date(row.expires_at).getTime() };
  writeSession(POST_TOKEN_KEY, session);
  return session;
}

/**
 * Turns a thrown thing into a sentence worth showing an operator.
 *
 * A message Postgres wrote is kept exactly as it is -- that is the whole
 * value of it. What gets replaced is the browser's own wording for a request
 * that never left: "Failed to fetch" and "Load failed" describe a network,
 * but on screen they read as a bug in this console.
 */
export function describeFailure(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/failed to fetch|load failed|networkerror|network request failed/i.test(message)) {
    return "Couldn't reach the database. Check the connection and try again.";
  }
  return message;
}

// -- calls -----------------------------------------------------------------

/**
 * Every read and write goes through here so a failure reports what actually
 * went wrong. A console that says "something went wrong" to its own operator
 * is worse than no console: the whole point of this screen is finding out.
 */
async function call<T>(
  request: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  // A routine that answered without an error answered. `void`-returning ones
  // legitimately hand back nothing, which is why this is a cast rather than
  // a null check that would reject them.
  return data as T;
}

export const adminStats = (t: string) =>
  call<Json>(supabase.rpc("admin_get_stats", { p_token: t }));

export const adminSiteCounts = (t: string) =>
  call<Json>(supabase.rpc("admin_site_counts", { p_token: t }));

export const adminAccountStats = (t: string) =>
  call<Json>(supabase.rpc("admin_get_account_stats", { p_token: t }));

export const adminModeration = (t: string) =>
  call<Json>(supabase.rpc("admin_get_moderation", { p_token: t }));

export const adminSettings = (t: string) =>
  call<Json>(supabase.rpc("admin_get_settings", { p_token: t }));

export const adminRecalculate = (t: string) =>
  call<Json>(supabase.rpc("admin_recalculate_stats", { p_token: t }));

export const adminPending = (t: string, limit = 100) =>
  call<AdminSubmission[]>(
    supabase.rpc("admin_list_pending_submissions", { p_token: t, p_limit: limit }),
  );

export const adminSubmissions = (t: string, limit = 100) =>
  call<AdminSubmission[]>(supabase.rpc("admin_list_submissions", { p_token: t, p_limit: limit }));

export const adminApprove = (t: string, id: string) =>
  call<boolean>(supabase.rpc("admin_approve_submission", { p_token: t, p_id: id }));

export const adminReject = (t: string, id: string) =>
  call<boolean>(supabase.rpc("admin_reject_submission", { p_token: t, p_id: id }));

/** Blank search and "all" status are omitted rather than sent empty. */
export function adminSites(t: string, search: string, status: string) {
  const trimmed = search.trim();
  return call<AdminSite[]>(
    supabase.rpc("admin_list_sites", {
      p_token: t,
      ...(trimmed ? { p_search: trimmed } : {}),
      ...(status && status !== "all" ? { p_status: status } : {}),
    }),
  );
}

export const adminSpamSites = (t: string) =>
  call<AdminSite[]>(supabase.rpc("admin_list_spam_sites", { p_token: t }));

export const adminSetSiteStatus = (t: string, id: string, status: string) =>
  call<undefined>(
    supabase.rpc("admin_set_site_status", { p_token: t, p_id: id, p_status: status }),
  );

export const adminDeleteSite = (t: string, id: string) =>
  call<boolean>(supabase.rpc("admin_delete_site", { p_token: t, p_id: id }));

export const adminSetSubmissionMode = (t: string, mode: string) =>
  call<boolean>(supabase.rpc("admin_set_submission_mode", { p_token: t, p_mode: mode }));

// -- messages --------------------------------------------------------------

export const postSentLog = (t: string) =>
  call<Json>(supabase.rpc("chrnic_get_sent_log", { p_token: t }));

export const postAccountStats = (t: string) =>
  call<Json>(supabase.rpc("chrnic_get_account_stats", { p_token: t }));

/** One person, by their auth user id. */
export const postToUser = (t: string, userId: string, subject: string, body: string) =>
  call<Json>(
    supabase.rpc("chrnic_send_message", {
      p_token: t,
      p_recipient_user_id: userId,
      p_subject: subject,
      p_body: body,
    }),
  );

/**
 * Everyone.
 *
 * The idempotency key is generated once when a draft is started and held for
 * as long as that draft exists, so a double tap, a retried request or a
 * reload mid-send lands as one broadcast rather than two. It is only rolled
 * when the operator starts a genuinely new message.
 */
export const postBroadcast = (t: string, subject: string, body: string, key: string) =>
  call<Json>(
    supabase.rpc("chrnic_broadcast_message", {
      p_token: t,
      p_subject: subject,
      p_body: body,
      p_idempotency_key: key,
    }),
  );

/** Resolves a username to the account id the message routines want. */
export async function findUserByUsername(username: string): Promise<{
  id: string;
  username: string | null;
  display_name: string | null;
} | null> {
  const slug = username.trim().replace(/^@/, "").toLowerCase();
  if (!slug) return null;
  const { data, error } = await supabase.rpc("get_public_profile", { p_slug: slug });
  if (error) throw new Error(error.message);
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const record = data as Record<string, Json | undefined>;
  const id = record["id"];
  if (typeof id !== "string") return null;
  const name = record["username"];
  const display = record["display_name"];
  return {
    id,
    username: typeof name === "string" ? name : null,
    display_name: typeof display === "string" ? display : null,
  };
}

export function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `k-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}
