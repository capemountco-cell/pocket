import { useEffect, useState } from "react";
import type { DiscoverySite } from "@/data/seed-sites";

// Device-local record of what this person has done with the sites they've
// been served: how they reacted, what they kept, what they never want to see
// again, and anything they added themselves. Anonymous and offline-first --
// it is keyed off nothing but the browser it lives in, so every sheet works
// signed out. Milestone 4 moves the same shapes to `reactions` /
// `collection_items` / `submissions` rows behind the same functions, so call
// sites never learn where the data actually lives.

// The reaction vocabulary is closed: a typo fails to compile rather than
// writing a value nothing downstream knows how to read.
export type ReactionKind = "like" | "not_for_me" | "hidden" | "report";

export type SitePrefs = {
  // siteId -> the person's most recent reaction to it.
  reactions: Record<string, ReactionKind>;
  savedIds: string[];
  hiddenIds: string[];
  // Sites added on this device, appended to the served deck.
  submitted: DiscoverySite[];
};

const REACTIONS_KEY = "app_reactions_v1";
const SAVED_KEY = "app_saved_v1";
const HIDDEN_KEY = "app_hidden_v1";
const SUBMITTED_KEY = "app_submissions_v1";

const EMPTY: SitePrefs = { reactions: {}, savedIds: [], hiddenIds: [], submitted: [] };

// SSR renders the empty state and the first client effect hydrates the real
// one, exactly like the theme and nav-style stores -- reading localStorage
// during render would make the server and client markup disagree.
let current: SitePrefs = EMPTY;

type Listener = (prefs: SitePrefs) => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch {
      /* a bad subscriber must not take the rest down */
    }
  });
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota: the in-memory copy still drives this session */
  }
}

export function getSitePrefs(): SitePrefs {
  return current;
}

export function initSitePrefs(): void {
  current = {
    reactions: readJson<Record<string, ReactionKind>>(REACTIONS_KEY, {}),
    savedIds: readJson<string[]>(SAVED_KEY, []),
    hiddenIds: readJson<string[]>(HIDDEN_KEY, []),
    submitted: readJson<DiscoverySite[]>(SUBMITTED_KEY, []),
  };
  notify();
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

/** Record (or with `null`, clear) how this device reacted to one site. */
export function setReaction(siteId: string, kind: ReactionKind | null): void {
  const reactions = { ...current.reactions };
  if (kind === null) delete reactions[siteId];
  else reactions[siteId] = kind;

  // "Don't show this again" is the one reaction that also changes what gets
  // served, so it writes both halves in a single commit -- a reaction stored
  // without its hide would leave the site in rotation and read as a bug.
  const hiddenIds =
    kind === "hidden"
      ? Array.from(new Set([...current.hiddenIds, siteId]))
      : current.hiddenIds.filter((id) => id !== siteId);

  current = { ...current, reactions, hiddenIds };
  writeJson(REACTIONS_KEY, reactions);
  writeJson(HIDDEN_KEY, hiddenIds);
  notify();
}

/** @returns whether the site is saved *after* the toggle. */
export function toggleSaved(siteId: string): boolean {
  const has = current.savedIds.includes(siteId);
  const savedIds = has
    ? current.savedIds.filter((id) => id !== siteId)
    : [siteId, ...current.savedIds];
  current = { ...current, savedIds };
  writeJson(SAVED_KEY, savedIds);
  notify();
  return !has;
}

export function isSaved(siteId: string): boolean {
  return current.savedIds.includes(siteId);
}

export function addSubmission(site: DiscoverySite): void {
  const submitted = [site, ...current.submitted.filter((s) => s.url !== site.url)];
  current = { ...current, submitted };
  writeJson(SUBMITTED_KEY, submitted);
  notify();
}
