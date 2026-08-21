import { supabase } from "@/integrations/supabase/client";

/**
 * Screenshots for catalogue sites.
 *
 * The capture-screenshot function hashes the URL, looks in the `screenshots`
 * storage bucket, and either returns what is already there or drives a real
 * headless browser at 1440x900 with deviceScaleFactor 2 -- so the PNGs are
 * 2880x1800, which is why they hold up as the front of a card rather than a
 * thumbnail.
 *
 * Two things about that shape the code here.
 *
 * The bucket is private, so what comes back is a signed URL that expires in a
 * week. There is nothing worth storing long-term; the URL is fetched per
 * session and kept in memory.
 *
 * A cache miss is a real browser session on someone else's paid account, and
 * takes about eight seconds against roughly one for a hit. So captures are
 * requested only for cards a person actually scrolls to, and no more than a
 * couple are ever in flight at once -- without the gate, one flick down the
 * page would fan out into a dozen simultaneous sessions.
 */

/** Simultaneous captures. Low on purpose: each miss is a browser session. */
const MAX_IN_FLIGHT = 2;

/** Signed URLs live a week; this map lives for the tab. */
const cache = new Map<string, Promise<string | null>>();

let inFlight = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release() {
  const next = queue.shift();
  if (next) next();
  else inFlight -= 1;
}

async function request(url: string): Promise<string | null> {
  await acquire();
  try {
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      url?: string;
    }>("capture-screenshot", { body: { url } });
    if (error || !data?.ok || !data.url) return null;
    return data.url;
  } catch {
    return null;
  } finally {
    release();
  }
}

/**
 * The screenshot for a URL, or null if it could not be taken.
 *
 * Null is an ordinary outcome, not an error: a site can be down, refuse a
 * headless browser, or simply time out. Callers fall back rather than retry --
 * a retry loop here would bill for the same failure repeatedly.
 */
export function screenshotFor(url: string): Promise<string | null> {
  const existing = cache.get(url);
  if (existing) return existing;
  const pending = request(url);
  cache.set(url, pending);
  return pending;
}
