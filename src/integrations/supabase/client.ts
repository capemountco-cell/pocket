import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Connection details for the Postgres/Auth/Storage backend.
//
// This points at the catalogue's real home -- the project the predecessor app
// has been filling since June -- not the schema-only copy that carries the
// same name in the Supabase dashboard. That copy has every table and function
// but has never held a single site row.
//
// Both values below are public. The URL is an address; the second is the
// publishable (anon) key, which is designed to sit in a browser bundle and
// carries no privileges of its own -- Row Level Security is the real access
// boundary, which is why every write goes through a SECURITY DEFINER
// function. It is committed at the owner's direction, matching how the
// predecessor repo already ships it. Environment variables still take
// precedence, so a fork can repoint without editing source.
//
// The SERVICE ROLE key is a different thing entirely: it bypasses RLS. It
// must never appear here, in any client bundle, or under any name carrying a
// VITE_ prefix. There is no server-side secret for this backend either: every
// write goes through a SECURITY DEFINER function reached with the publishable
// key, so nothing in this app needs a name like SUPABASE_SERVICE_ROLE_KEY and
// none should be created for it.
// Read from several names, first non-empty wins.
//
// The host reserves the SUPABASE_ prefix, so a variable carrying that word
// may be impossible to create in the deployment panel -- which would leave
// the escape hatch below unusable exactly when it is needed. The DB_ names
// carry no reserved word at all and are the ones to reach for.
//
// Every name is written out in full on purpose. Vite replaces
// `import.meta.env["LITERAL"]` at build time by matching the literal text; a
// name assembled from a variable is never substituted and always reads
// undefined in the browser. For the same reason each one must start with
// VITE_ -- that is the only prefix Vite exposes to client code, so a
// NEXT_PUBLIC_ name would be silently absent here however it was set.
function fromEnv(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

const SUPABASE_URL =
  fromEnv(
    import.meta.env["VITE_POCKET_DB_URL"],
    import.meta.env["VITE_PUBLIC_DB_URL"],
    import.meta.env["VITE_SUPABASE_URL"],
  ) ?? "https://boembmgwjjdqgkcokapx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  fromEnv(
    import.meta.env["VITE_POCKET_DB_KEY"],
    import.meta.env["VITE_PUBLIC_DB_KEY"],
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
  ) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZW1ibWd3ampkcWdrY29rYXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODM0NTIsImV4cCI6MjA5NjE1OTQ1Mn0.VP3pSqYAyxxmGZxDfc7gUm3fFGBKKN-iIKtSDA8rx6c";

/**
 * Whether the app has a key to talk to the backend at all.
 *
 * Checked by the discovery screen so a missing key reports itself precisely
 * instead of surfacing as a generic network failure — the two have completely
 * different fixes, and guessing wrong costs an afternoon.
 */
export const isSupabaseConfigured = SUPABASE_PUBLISHABLE_KEY.length > 0;

// Sessions persist in the browser and nowhere else: on the server there is no
// storage to write to, and touching localStorage during SSR would throw before
// the first byte of HTML went out.
const isBrowser = typeof window !== "undefined";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    // A magic link comes back with the tokens in the URL fragment; without
    // this the link lands on a still-signed-out page.
    detectSessionInUrl: isBrowser,
  },
});

export type SiteRow = Database["public"]["Tables"]["sites"]["Row"];
