import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device-id";
import { initSitePrefs } from "@/lib/site-prefs";

// Everything the app knows about who is signed in. Auth is optional
// throughout: the discovery loop, reactions and the collection all work on the
// anonymous device id, and signing in only attaches that history to an
// account. Nothing here may gate the core loop.

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as Profile | null;
  return row ?? null;
}

// Idempotent: creates the profile row if the auth user is missing one. The
// row is written by a trigger on sign-up, and a trigger that loses the race
// leaves someone signed in with no profile and no way out. Retrying with
// backoff turns that dead end into a delay.
async function ensureProfile(method: string): Promise<void> {
  try {
    await supabase.rpc("ensure_my_profile", { p_method: method });
  } catch {
    /* the retry loop is the recovery path */
  }
}

async function loadProfileWithSelfHeal(): Promise<Profile | null> {
  let profile = await getMyProfile();
  if (profile) return profile;

  for (const delay of [300, 1200, 3000]) {
    await ensureProfile("auth");
    profile = await getMyProfile();
    if (profile) return profile;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return null;
}

/**
 * Attach this device's saved sites to the account that just signed in.
 *
 * Someone who collected sites signed out and then made an account expects to
 * find them there; without this they silently appear to lose the lot.
 */
async function mergeDeviceHistory(userId: string): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await supabase.rpc("merge_device_bookmarks_to_user", {
      p_user_id: userId,
      p_device_id: deviceId,
    });
    // Re-read so the collection reflects the merge without a reload.
    await initSitePrefs(deviceId);
  } catch {
    /* the device's own rows are untouched, so nothing is lost by failing */
  }
}

export type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the first session check resolves, so UI can avoid a signed-out flash. */
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setProfile(await loadProfileWithSelfHeal());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (!data.session) {
        setLoading(false);
        return;
      }
      void loadProfileWithSelfHeal()
        .then((p) => {
          if (!cancelled) setProfile(p);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        return;
      }
      void loadProfileWithSelfHeal().then((p) => setProfile(p));
      if (event === "SIGNED_IN") void mergeDeviceHistory(next.user.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    // The device keeps its own history, so re-read it as the signed-out view.
    const deviceId = getDeviceId();
    if (deviceId) await initSitePrefs(deviceId);
  }, []);

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile,
    signOut,
  };
}

export { ensureProfile };
