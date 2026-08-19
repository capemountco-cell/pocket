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
// VITE_ prefix.
const SUPABASE_URL =
  import.meta.env["VITE_SUPABASE_URL"] ?? "https://boembmgwjjdqgkcokapx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
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
