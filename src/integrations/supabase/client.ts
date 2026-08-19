import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Connection details for the Postgres/Auth/Storage backend.
//
// These two values are public by design: the publishable key identifies the
// project and carries no privileges of its own, and both are visible in any
// deployed bundle. Row Level Security is the actual access boundary, which is
// why every write in this app goes through a SECURITY DEFINER function rather
// than a direct table write. The service-role key grants real privileges and
// must never appear in this repository or in any client bundle.
//
// Env vars win where they are set, so a fork can point at its own project
// without editing source.
const SUPABASE_URL =
  import.meta.env["VITE_SUPABASE_URL"] ?? "https://kmxpyemqddvfchkeureq.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
  "sb_publishable_9WbJyinu1m1dFbkNullPgw_h7hsLyXC";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Nobody signs in yet, and a session-less client must not try to write a
    // session to storage during SSR.
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type SiteRow = Database["public"]["Tables"]["sites"]["Row"];
