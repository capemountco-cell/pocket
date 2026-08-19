import { useEffect, useState } from "react";
import {
  fetchReactions,
  fetchSavedSites,
  toggleSaved as writeToggleSaved,
  writeReaction,
  type DiscoverySite,
  type ReactionKind,
} from "@/lib/discovery";

export type { ReactionKind } from "@/lib/discovery";

// What this device has done with the sites it has been served, held in memory
// for the UI to read synchronously. The database is the source of truth; this
// is a cache in front of it, written through on every change so a tap feels
// instant instead of waiting for a round trip.
//
// Nothing here is persisted locally: a reaction that only ever reached
// localStorage would be invisible to the feed, and the feed is what a
// reaction is *for*.
export type SitePrefs = {
  reactions: Record<string, ReactionKind>;
  savedIds: string[];
  savedSites: DiscoverySite[];
  /** False until the first hydrate lands, so a screen can tell "none" from "not yet". */
  ready: boolean;
};

const EMPTY: SitePrefs = { reactions: {}, savedIds: [], savedSites: [], ready: false };

let current: SitePrefs = EMPTY;
let deviceId: string | null = null;

type Listener = (prefs: SitePrefs) => void;
const listeners = new Set<Listener>();

function commit(next: SitePrefs): void {
  current = next;
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch {
      /* a bad subscriber must not take the rest down */
    }
  });
}

export function getSitePrefs(): SitePrefs {
  return current;
}

export function subscribeSitePrefs(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useSitePrefs(): SitePrefs {
  const [prefs, setPrefs] = useState<SitePrefs>(() => getSitePrefs());
  useEffect(() => subscribeSitePrefs(setPrefs), []);
  return prefs;
}

/**
 * Pull this device's reactions and collection from the database. Safe to call
 * again — later screens re-hydrate through the same path.
 */
export async function initSitePrefs(id: string): Promise<void> {
  deviceId = id;
  try {
    const [reactions, savedSites] = await Promise.all([fetchReactions(id), fetchSavedSites(id)]);
    commit({
      reactions,
      savedSites,
      savedIds: savedSites.map((s) => s.id),
      ready: true,
    });
  } catch {
    // A failed hydrate leaves the app usable: the feed is a separate call, and
    // marking the cache ready keeps the sheets from claiming to still be
    // loading forever.
    commit({ ...current, ready: true });
  }
}

/**
 * Record how this device feels about a site.
 *
 * `like` toggles: reacting the same way twice clears it. The three negative
 * kinds also take the site out of this device's rotation server-side, which is
 * why the caller is told to move on afterwards.
 */
export async function setReaction(siteId: string, kind: ReactionKind): Promise<void> {
  if (!deviceId) return;

  // Optimistic: the sheet closes on the tap, so the bar's state must already
  // be right by the time it does.
  const previous = current.reactions;
  const optimistic = { ...previous };
  if (optimistic[siteId] === kind) delete optimistic[siteId];
  else optimistic[siteId] = kind;
  commit({ ...current, reactions: optimistic });

  try {
    const settled = await writeReaction(deviceId, siteId, kind);
    const reactions = { ...current.reactions };
    if (settled === null) delete reactions[siteId];
    else reactions[siteId] = settled;
    commit({ ...current, reactions });
  } catch {
    commit({ ...current, reactions: previous });
  }
}

/** @returns whether the site is saved *after* the toggle. */
export async function toggleSaved(site: DiscoverySite): Promise<boolean> {
  if (!deviceId) return current.savedIds.includes(site.id);

  const wasSaved = current.savedIds.includes(site.id);
  const optimisticIds = wasSaved
    ? current.savedIds.filter((id) => id !== site.id)
    : [site.id, ...current.savedIds];
  const optimisticSites = wasSaved
    ? current.savedSites.filter((s) => s.id !== site.id)
    : [site, ...current.savedSites];
  commit({ ...current, savedIds: optimisticIds, savedSites: optimisticSites });

  try {
    const nowSaved = await writeToggleSaved(deviceId, site.id);
    // Trust the server's answer over the guess: two devices, or two taps in
    // flight at once, can disagree with it.
    if (nowSaved !== !wasSaved) {
      const savedSites = await fetchSavedSites(deviceId);
      commit({ ...current, savedSites, savedIds: savedSites.map((s) => s.id) });
    }
    return nowSaved;
  } catch {
    commit({
      ...current,
      savedIds: wasSaved
        ? [site.id, ...optimisticIds]
        : optimisticIds.filter((id) => id !== site.id),
      savedSites: wasSaved
        ? [site, ...optimisticSites]
        : optimisticSites.filter((s) => s.id !== site.id),
    });
    return wasSaved;
  }
}

export function isSaved(siteId: string): boolean {
  return current.savedIds.includes(siteId);
}
