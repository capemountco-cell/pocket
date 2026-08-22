import { supabase } from "@/integrations/supabase/client";

/**
 * What people said about a site.
 *
 * Anonymous, like everything else here -- there is no account to attach a name
 * to and the product does not want one. But a thread where every voice looks
 * identical reads as one person talking to themselves, so each device carries
 * a short tag derived from its id. The tag is a hash computed server-side: it
 * distinguishes speakers and identifies nobody.
 *
 * Reads and writes both go through SECURITY DEFINER functions. The table has
 * RLS on and no policies at all, so a browser has no path to it directly --
 * the shape the rest of this schema already uses, and the reason the rate
 * limits and the length cap cannot be walked around from the client.
 */

export type SiteComment = {
  id: string;
  body: string;
  createdAt: string;
  /** Four hex characters. Stable per device, meaningless on its own. */
  author: string;
  /** Written by this device, so it can be taken down. */
  mine: boolean;
};

export type CommentPage = { total: number; comments: SiteComment[] };

/**
 * These functions are newer than the checked-in generated types, and that file
 * says not to hand-edit it -- so the calls it does not know about are typed
 * here instead of forged in there. The narrowing disappears the next time the
 * types are regenerated.
 */
type CommentRpc = {
  rpc(
    fn: "get_site_comments",
    args: { p_site_id: string; p_device_id: string | null; p_limit: number; p_offset: number },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  rpc(
    fn: "add_site_comment",
    args: { p_device_id: string; p_site_id: string; p_body: string },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
  rpc(
    fn: "remove_site_comment" | "report_site_comment",
    args: { p_device_id: string; p_comment_id: string },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

const client = () => supabase as unknown as CommentRpc;

/** The longest a comment can be. Mirrors the cap the function enforces. */
export const COMMENT_MAX = 500;

export async function fetchComments(
  siteId: string,
  deviceId: string | null,
  limit = 50,
  offset = 0,
): Promise<CommentPage> {
  const { data, error } = await client().rpc("get_site_comments", {
    p_site_id: siteId,
    p_device_id: deviceId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);

  const raw = (data ?? {}) as { total?: number; comments?: Array<Record<string, unknown>> };
  return {
    total: Number(raw.total ?? 0),
    comments: (raw.comments ?? []).map((c) => ({
      id: String(c["id"] ?? ""),
      body: String(c["body"] ?? ""),
      createdAt: String(c["created_at"] ?? ""),
      author: String(c["author"] ?? "????"),
      mine: c["mine"] === true,
    })),
  };
}

export type PostResult = { ok: true } | { ok: false; message: string };

/**
 * Every refusal is named.
 *
 * A composer that clears what someone typed and says nothing is worse than one
 * that will not accept it, so each code the function can return gets its own
 * sentence rather than falling through to "something went wrong".
 */
export async function postComment(
  deviceId: string,
  siteId: string,
  body: string,
): Promise<PostResult> {
  const { data, error } = await client().rpc("add_site_comment", {
    p_device_id: deviceId,
    p_site_id: siteId,
    p_body: body,
  });
  if (error) return { ok: false, message: "Couldn't post that just now." };

  const result = (data ?? {}) as { ok?: boolean; error?: string };
  if (result.ok) return { ok: true };

  switch (result.error) {
    case "empty":
      return { ok: false, message: "Write something first." };
    case "too_long":
      return { ok: false, message: `Keep it under ${COMMENT_MAX} characters.` };
    case "too_fast":
      return { ok: false, message: "Give it a moment before posting again." };
    case "too_many":
      return { ok: false, message: "That's a lot of comments in an hour. Try again later." };
    case "no_site":
      return { ok: false, message: "This site isn't accepting comments." };
    default:
      return { ok: false, message: "Couldn't post that just now." };
  }
}

/** Take down your own. Soft server-side, so moderation keeps the record. */
export async function removeComment(deviceId: string, commentId: string): Promise<boolean> {
  const { data, error } = await client().rpc("remove_site_comment", {
    p_device_id: deviceId,
    p_comment_id: commentId,
  });
  if (error) return false;
  return ((data ?? {}) as { ok?: boolean }).ok === true;
}

/** Report someone else's. Three reports hide it. */
export async function reportComment(deviceId: string, commentId: string): Promise<boolean> {
  const { data, error } = await client().rpc("report_site_comment", {
    p_device_id: deviceId,
    p_comment_id: commentId,
  });
  if (error) return false;
  return ((data ?? {}) as { ok?: boolean }).ok === true;
}

/**
 * How long ago, in as few characters as possible.
 *
 * A comment thread is scanned, not read line by line, so the timestamp has to
 * sit in the corner without competing with the sentence next to it.
 */
export function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d`;
  const weeks = days / 7;
  if (weeks < 52) return `${Math.floor(weeks)}w`;
  return `${Math.floor(days / 365)}y`;
}
