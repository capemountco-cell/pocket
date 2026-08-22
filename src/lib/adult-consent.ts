const KEY = "app_adult_ok_v1";

/**
 * Which adult sites this person has asked to see.
 *
 * Per site, not once for the app. Saying yes to one site is not a standing
 * instruction to show every other one -- the warning is only worth anything if
 * it is attached to the thing being warned about.
 *
 * Per session too. sessionStorage rather than localStorage means the answer
 * lasts as long as the tab is open, so going back to a site you just cleared
 * does not ask again, and a phone picked up tomorrow starts from no.
 */
function read(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [],
    );
  } catch {
    return new Set();
  }
}

export function hasAcknowledgedAdult(siteId: string): boolean {
  if (typeof window === "undefined") return false;
  return read().has(siteId);
}

export function acknowledgeAdult(siteId: string): void {
  if (typeof window === "undefined") return;
  try {
    const seen = read();
    seen.add(siteId);
    window.sessionStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // Storage denied. The warning simply asks again, which is the safe way
    // for this particular thing to fail.
  }
}

/* ---------------------------------------------------------------------- */

const ALWAYS_KEY = "app_adult_always_v1";

/**
 * "Stop asking."
 *
 * A standing answer, set once in Settings, that replaces the per-site warning
 * everywhere: the full-screen gate before a site, and the covered frame where
 * an adult entry sits on a board. Off by default, and deliberately a different
 * kind of storage from the answers above -- those are per site and last for a
 * tab, this is one decision that outlives the session, which is the whole
 * point of it being a setting rather than a button on the warning.
 *
 * Read synchronously so nothing renders a warning for a frame and then takes
 * it away, which would be worse than either state on its own.
 */
export function alwaysShowAdult(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ALWAYS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAlwaysShowAdult(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(ALWAYS_KEY, "1");
    else window.localStorage.removeItem(ALWAYS_KEY);
  } catch {
    // Storage denied. The warning keeps asking, which is the safe way for
    // this particular thing to fail.
  }
  window.dispatchEvent(new CustomEvent(ADULT_PREF_EVENT));
}

/** Fired when the standing answer changes, so open screens can catch up. */
export const ADULT_PREF_EVENT = "app:adult-pref";
