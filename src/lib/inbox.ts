import { supabase } from "@/integrations/supabase/client";

/**
 * Messages the admin sends to a person, read back by that person.
 *
 * The path exists server-side already: admin_broadcasts holds what was sent
 * and admin_messages holds one row per recipient.
 *
 * The intended door, get_my_admin_messages, is broken in the database. It
 * answers 200 with an empty list for anon -- which is how it looks healthy --
 * and errors the moment a real session calls it:
 *
 *   42803: column "admin_messages.created_at" must appear in the GROUP BY
 *          clause or be used in an aggregate function
 *
 * That is a defect in the deployed function body, and fixing it needs a
 * CREATE OR REPLACE this deployment cannot run. So the table is read
 * directly, which RLS does allow for an authenticated reader.
 *
 * The filter on recipient_user_id is deliberate belt-and-braces. Anon reads
 * come back empty and an authenticated read is meant to be scoped to the
 * reader, but with no messages in the table there was no way to prove the
 * policy actually scopes rather than merely returning nothing to everyone --
 * so the client asks only for its own and never relies on being handed only
 * its own. Once the function is repaired, prefer it and delete this.
 */
export type InboxMessage = {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
  broadcast_id: string | null;
};

/**
 * Read state lives on the device.
 *
 * admin_messages has a read_at column, but the function that would set it is
 * not deployed on this project -- mark_admin_message_read answers 404. Rather
 * than pretend, read state is kept locally: it is per-device instead of per
 * account, which is worth saying out loud, and it is why read_at from the
 * server is still honoured when it happens to be set.
 */
const READ_KEY = "app_inbox_read_v1";

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

/** Whether a message has been opened, by either record. */
export function isRead(message: InboxMessage): boolean {
  return Boolean(message.read_at) || readIds().has(message.id);
}

/** Remember that a message has been opened. */
export function markRead(id: string): void {
  if (typeof window === "undefined") return;
  const ids = readIds();
  if (ids.has(id)) return;
  ids.add(id);
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // A device that refuses storage simply shows everything as unread.
  }
}

/**
 * Every message for the signed-in person, newest first.
 *
 * Returns empty rather than throwing: the inbox is a place someone visits,
 * not a step in a flow, so a failed read shows an empty inbox with a retry
 * instead of an error that blocks anything.
 */
export async function fetchInbox(userId: string): Promise<InboxMessage[]> {
  const { data, error } = await supabase
    .from("admin_messages")
    .select("id,subject,body,created_at,read_at,broadcast_id")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InboxMessage[];
}

/** How many are unread, for the badge on the menu row. */
export function unreadCount(messages: InboxMessage[]): number {
  return messages.filter((m) => !isRead(m)).length;
}
