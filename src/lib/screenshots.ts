import { supabase } from "@/integrations/supabase/client";

/**
 * Screenshots for catalogue sites.
 *
 * The capture-screenshot function hashes the URL, looks in the `screenshots`
 * storage bucket, and either returns what is already there or drives a real
 * headless browser at 1440x900 with deviceScaleFactor 2 -- so the stored PNGs
 * are 2880x1800.
 *
 * That is roughly ten times the picture a phone card can show, and the cost
 * of shipping it was the reason Explore felt slow. Measured against the live
 * bucket, on the three sites Explore actually features:
 *
 *   stored PNG at 2880x1800   26 KB / 258 KB / 422 KB, 5.2 megapixels to decode
 *   same shot at 900px wide   12 KB /  31 KB /  50 KB, 0.5 megapixels
 *
 * So what a card is handed is not the stored object but a resize of it, via
 * Storage's own render endpoint -- same signed URL, `/object/sign/` swapped
 * for `/render/image/sign/`, which answers WebP. The full-size original is
 * carried alongside purely as a fallback: if the transformer ever refuses an
 * object, the card can still show the picture rather than an empty frame.
 *
 * The bucket is private, so what comes back is a signed URL that expires in a
 * week. There is nothing worth storing long-term; it is fetched per session
 * and kept in memory.
 *
 * A cache miss is a real browser session on someone else's paid account --
 * about seven seconds against under one for a hit -- so nothing is ever
 * retried, and the gate below bounds how many can run at once.
 */

export type Screenshot = {
  /** Resized for a card. What the img actually loads. */
  src: string;
  /** The stored 2880x1800 original, if the resize will not serve. */
  full: string;
};

/**
 * Simultaneous captures.
 *
 * Three, because Explore only ever puts a screenshot on its top three -- so
 * this lets the whole page start at once instead of making the third card
 * wait behind the first two, without ever fanning out beyond the page.
 */
const MAX_IN_FLIGHT = 3;

/**
 * What a card is actually shown.
 *
 * 900px covers a full-bleed card on a 390pt phone at 2x with room to spare,
 * and quality 70 is where the difference stops being visible on a screenshot
 * of a web page. Anything the endpoint will not rewrite is passed through
 * untouched rather than guessed at.
 */
const CARD_WIDTH = 900;
const CARD_QUALITY = 70;

function resized(signed: string): string {
  const OBJECT = "/storage/v1/object/sign/";
  if (!signed.includes(OBJECT)) return signed;
  const rendered = signed.replace(OBJECT, "/storage/v1/render/image/sign/");
  // The signed URL already carries ?token=, so this is always an extra param.
  const join = rendered.includes("?") ? "&" : "?";
  return `${rendered}${join}width=${CARD_WIDTH}&quality=${CARD_QUALITY}`;
}

/** Signed URLs live a week; this map lives for the tab. */
const cache = new Map<string, Promise<Screenshot | null>>();

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

async function request(url: string): Promise<Screenshot | null> {
  await acquire();
  try {
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      url?: string;
    }>("capture-screenshot", { body: { url } });
    if (error || !data?.ok || !data.url) return null;
    return { src: resized(data.url), full: data.url };
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
export function screenshotFor(url: string): Promise<Screenshot | null> {
  const existing = cache.get(url);
  if (existing) return existing;
  const pending = request(url);
  cache.set(url, pending);
  return pending;
}
