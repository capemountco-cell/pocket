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
