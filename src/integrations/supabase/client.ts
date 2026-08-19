import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Connection details for the Postgres/Auth/Storage backend.
//
// This points at the catalogue's real home -- the project the predecessor app
// has been filling since June -- not the schema-only copy that carries the
// same name in the Supabase dashboard. That copy has every table and function
// but has never held a single site row.
//
// The project URL is an address, not a credential, so it has a default here.
// The key does NOT: it is read from the environment only, matching the rule
// that no key belongs in this repository. It is the publishable (anon) key,
// which is safe in a browser bundle -- Row Level Security is the real access
// boundary, which is why every write goes through a SECURITY DEFINER function.
// The service-role key bypasses RLS entirely and must never appear here or in
// any client bundle, under any name carrying a VITE_ prefix.
const SUPABASE_URL =
  import.meta.env["VITE_SUPABASE_URL"] ?? "https://boembmgwjjdqgkcokapx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";

/**
 * Whether the app has a key to talk to the backend at all.
 *
 * Checked by the discovery screen so a missing key reports itself precisely
 * instead of surfacing as a generic network failure — the two have completely
 * different fixes, and guessing wrong costs an afternoon.
 */
export const isSupabaseConfigured = SUPABASE_PUBLISHABLE_KEY.length > 0;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Nobody signs in yet, and a session-less client must not try to write a
    // session to storage during SSR.
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type SiteRow = Database["public"]["Tables"]["sites"]["Row"];
