import { createServerFn } from "@tanstack/react-start";

/**
 * The picture or the film inside a post on X, rather than a picture of X.
 *
 * A saved link to a post used to reach a card the same way every other link
 * does: ask the capture service for a screenshot of the address. For x.com
 * that produces a photograph of a login wall, because x.com shows a logged-out
 * headless browser a login wall. The card was accurate and useless -- the same
 * grey interstitial for every post ever saved.
 *
 * X publishes the answer to this itself. `cdn.syndication.twimg.com` is what
 * its own embed widget calls to render a post outside x.com, and it hands back
 * the post's media as ordinary addresses -- an mp4 on video.twimg.com, a jpg
 * on pbs.twimg.com -- along with the media's real width and height. So a card
 * can show the clip at the shape the clip actually is, which for most of what
 * people save is portrait, not the 16:10 a screenshot comes in.
 *
 * Measured rather than assumed, against the three posts this was built for:
 *
 *   cdn.syndication.twimg.com/tweet-result  200, JSON, but
 *                                           access-control-allow-origin is
 *                                           https://platform.twitter.com only
 *   video.twimg.com/amplify_video/….mp4     200, access-control-allow-origin: *
 *                                           cross-origin-resource-policy:
 *                                           cross-origin
 *
 * The first of those is why this is a server function and not a fetch from the
 * card: the browser is refused, our own runtime is not. The second is why the
 * address it returns can go straight into a <video> tag.
 *
 * ---------------------------------------------------------------------------
 * What this cannot do, and it is not a bug here
 *
 * Syndication answers `TweetTombstone` -- an empty object, HTTP 200 -- for any
 * post X will not show a logged-out reader. That covers deleted posts, but it
 * also covers every post by an account X has put behind a login, which in
 * practice means most adult accounts. Two of the three posts this was built
 * against are exactly that: x.com answers 403 for their *profile pages* too,
 * and publish.twitter.com's oembed says "Sorry, you are not authorized to see
 * this status." There is no token, no header and no endpoint that changes
 * that; it is an authorisation decision, and the only key to it is a logged-in
 * session, which this app does not have and should not want.
 *
 * So a post resolves or it does not, and when it does not the card says so
 * plainly rather than showing a screenshot of the wall.
 */

export type TweetMedia = {
  kind: "video" | "image";
  /** The mp4 or jpg itself. Loadable cross-origin. */
  src: string;
  /** A still to hold the frame while a clip loads. */
  poster: string | null;
  width: number;
  height: number;
  /**
   * X's own `possibly_sensitive` flag.
   *
   * A pasted link has been through none of the catalogue's classification --
   * it was typed in, not reviewed -- so before this the only thing standing
   * between a reader and an adult clip was that the card showed a screenshot
   * of a login wall instead of the clip. Now that it shows the clip, that
   * accident is gone and something has to take its place.
   *
   * This is not a classifier and is not offered as one: it is what the
   * platform says about its own post, which is free, and which errs in both
   * directions. Where it says yes, the card covers itself and asks first --
   * the same cover, and the same "show me everything" preference, as every
   * other adult entry in the app.
   */
  sensitive: boolean;
};

/** The status id in an x.com or twitter.com address, if there is one. */
export function tweetIdOf(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  if (host !== "x.com" && host !== "twitter.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.indexOf("status");
  const id = at >= 0 ? parts[at + 1] : undefined;
  return id !== undefined && /^\d+$/.test(id) ? id : null;
}

/**
 * The `token` query parameter X's own widget sends.
 *
 * Reproduced rather than invented: this is the widget's arithmetic, base 36
 * with the zeros and the point stripped. The endpoint does not appear to check
 * it -- a single letter is answered the same way -- but sending the request
 * the shape its author expects is cheaper than depending on that staying true.
 *
 * `Number` on a 19-digit id loses precision. That is also what the widget
 * does, so the value matches; nothing here treats the token as an identifier.
 */
function tokenFor(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(6 ** 2).replace(/(0+|\.)/g, "");
}

/** Shapes of the response we read. Everything else in it is ignored. */
type Variant = { bitrate?: number; content_type?: string; url?: string };
type MediaDetail = {
  type?: string;
  media_url_https?: string;
  original_info?: { width?: number; height?: number };
  video_info?: { variants?: Variant[] };
};

/**
 * The best mp4 in a post's variants.
 *
 * X offers each clip at several bitrates plus an HLS playlist. The playlist is
 * skipped deliberately: Safari plays it natively and no other browser does,
 * and a card that animates on one phone and sits blank on another is worse
 * than one that always plays the plain file. So the highest-bitrate mp4 wins,
 * which for a phone-shot clip is a few hundred kilobytes.
 */
function bestMp4(variants: Variant[]): string | null {
  let best: Variant | null = null;
  for (const v of variants) {
    if (v.content_type !== "video/mp4" || typeof v.url !== "string") continue;
    if (!best || (v.bitrate ?? 0) > (best.bitrate ?? 0)) best = v;
  }
  return best?.url ?? null;
}

function fromDetail(detail: MediaDetail, sensitive: boolean): TweetMedia | null {
  const width = detail.original_info?.width;
  const height = detail.original_info?.height;
  if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) {
    return null;
  }
  const poster = typeof detail.media_url_https === "string" ? detail.media_url_https : null;

  if (detail.type === "video" || detail.type === "animated_gif") {
    const src = bestMp4(detail.video_info?.variants ?? []);
    // An animated gif on X is an mp4 wearing a gif's name, so both land here.
    if (src) return { kind: "video", src, poster, width, height, sensitive };
    // A clip whose variants we cannot read is not a photo: showing its still
    // as though it were the post would be quietly wrong.
    return null;
  }
  if (detail.type === "photo" && poster) {
    return { kind: "image", src: poster, poster: null, width, height, sensitive };
  }
  return null;
}

/**
 * What a post has to show, if anything.
 *
 * Three answers rather than one, because the card says something different
 * for each and saying the wrong one is a lie the reader cannot check:
 *
 *   media    a clip or a picture, at its own shape
 *   text     the post is public and is words; there is nothing to play
 *   hidden   X will not show this post to anyone who is not signed in
 *
 * Null stays reserved for "this address is not a post at all", which is the
 * answer for almost every link in the catalogue.
 */
export type TweetLook =
  | { state: "media"; media: TweetMedia }
  | { state: "text"; text: string; author: string }
  | { state: "hidden" };
export const tweetLook = createServerFn({ method: "GET" })
  .validator((data: unknown): { url: string } => {
    const url = (data as { url?: unknown } | null)?.url;
    if (typeof url !== "string" || url.trim().length === 0) {
      throw new Error("A URL is required.");
    }
    return { url: url.trim() };
  })
  .handler(async ({ data }): Promise<TweetLook | null> => {
    const id = tweetIdOf(data.url);
    if (!id) return null;

    const endpoint = `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${tokenFor(id)}`;

    let body: unknown;
    try {
      // Bounded, because a card is waiting on this and a hung request would
      // hold the frame empty rather than falling back to the placeholder.
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(6000),
        headers: { accept: "application/json" },
      });
      // A refusal at the transport is not evidence about the post either way,
      // so it is reported as hidden rather than as an empty post.
      if (!response.ok) return { state: "hidden" };
      body = await response.json();
    } catch {
      return { state: "hidden" };
    }

    const tweet = body as {
      __typename?: string;
      possibly_sensitive?: boolean;
      text?: string;
      mediaDetails?: MediaDetail[];
      user?: { screen_name?: string };
    } | null;
    // The tombstone: HTTP 200 with nothing in it, which is how X says no.
    if (!tweet || tweet.__typename !== "Tweet") return { state: "hidden" };

    const sensitive = tweet.possibly_sensitive === true;
    for (const detail of tweet.mediaDetails ?? []) {
      const media = fromDetail(detail, sensitive);
      // The first item only. A post can carry four pictures, and a card has
      // one frame; picking the first is what every other embed of a post does.
      if (media) return { state: "media", media };
    }

    // Public, and words. The t.co link X appends to its own media is stripped
    // because the media is not there to link to.
    const text = (tweet.text ?? "").replace(/https:\/\/t\.co\/\w+\s*$/, "").trim();
    const author = tweet.user?.screen_name ?? "";
    return { state: "text", text, author };
  });

/**
 * One request per post per tab.
 *
 * A card can mount, scroll out and mount again, and History renders every
 * entry it holds. Promises rather than values, so two cards for the same post
 * mounting together share the one request instead of racing.
 */
const cache = new Map<string, Promise<TweetLook | null>>();

export function tweetLookFor(url: string): Promise<TweetLook | null> {
  const id = tweetIdOf(url);
  if (!id) return Promise.resolve(null);
  const hit = cache.get(id);
  if (hit) return hit;
  // A request that never arrives says nothing about the post, so it is not
  // allowed to produce a claim about it either.
  const pending = tweetLook({ data: { url } }).catch((): TweetLook => ({ state: "hidden" }));
  cache.set(id, pending);
  return pending;
}
