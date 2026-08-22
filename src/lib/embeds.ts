/**
 * Official embeds for the places that refuse to be framed.
 *
 * A tweet is the case that made this necessary. x.com answers every request
 * with `X-Frame-Options: DENY`, so the discovery frame could never show one --
 * a link to a tweet fell through to the preview card, which is a picture of a
 * link rather than the thing itself.
 *
 * The header is still respected, never bypassed. What changes is which address
 * gets framed: these platforms all publish a second, purpose-built page whose
 * whole job is to be embedded, and that one answers with no frame restriction
 * at all. `platform.twitter.com/embed/Tweet.html` is exactly what X's own
 * widget script loads. So this is not a workaround for a refusal -- it is
 * taking the invitation the same company published next to it.
 *
 * Measured rather than assumed. Every endpoint below was requested and its
 * response headers read:
 *
 *   x.com/<user>/status/<id>          x-frame-options: DENY
 *   platform.twitter.com/embed/…      no frame restriction
 *   youtube-nocookie.com/embed/…      no frame restriction
 *   player.vimeo.com/video/…          no frame restriction
 *   open.spotify.com/embed/…          no frame restriction
 *   w.soundcloud.com/player/…         no frame restriction
 *   redditmedia.com/…?embed=true      frame-ancestors *
 *   tiktok.com/embed/v2/…             no frame restriction
 *   instagram.com/p/…/embed           no frame restriction
 *   archive.org/embed/…               no frame restriction
 *
 * A platform is added here only after its endpoint has been checked that way.
 * Guessing produces a blank rectangle: a browser-blocked frame paints the
 * browser's own error page and fires no event anything here could catch.
 */

export type Embed = {
  /** The address to frame. */
  src: string;
  /** Which platform this is, for the frame's accessible name. */
  kind: string;
  /**
   * Capabilities the framed player needs. Players are silent and inert
   * without it; anything not named here stays denied.
   */
  allow?: string;
};

const PLAYER_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";

function parse(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Host without `www.`, `m.`, or a mobile prefix, lowercased. */
function hostOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
}

/** Path split into non-empty segments. */
function partsOf(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

/**
 * The embeddable address for a link, or null if the platform is not one of
 * these.
 *
 * Null is the ordinary answer: almost every link in the catalogue is an
 * ordinary page that frames on its own terms, and this exists only for the
 * handful of platforms that publish a separate address for it.
 */
export function embedFor(raw: string): Embed | null {
  const url = parse(raw);
  if (!url) return null;
  const host = hostOf(url);
  const parts = partsOf(url);

  // A tweet. Both hostnames, because half the links in the world still say
  // twitter.com and the id is in the same place on either.
  if (host === "x.com" || host === "twitter.com") {
    const at = parts.indexOf("status");
    const id = at >= 0 ? parts[at + 1] : undefined;
    if (id && /^\d+$/.test(id)) {
      return {
        src: `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&dnt=true`,
        kind: "Post on X",
      };
    }
    return null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id =
      url.searchParams.get("v") ??
      (parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed" ? parts[1] : undefined);
    if (id) return video(`https://www.youtube-nocookie.com/embed/${id}`, "Video on YouTube");
    return null;
  }
  if (host === "youtu.be" && parts[0]) {
    return video(`https://www.youtube-nocookie.com/embed/${parts[0]}`, "Video on YouTube");
  }

  if (host === "vimeo.com" && parts[0] && /^\d+$/.test(parts[0])) {
    return video(`https://player.vimeo.com/video/${parts[0]}`, "Video on Vimeo");
  }

  if (host === "open.spotify.com") {
    // Locale-prefixed links exist: /intl-de/track/… as well as /track/….
    const kinds = ["track", "album", "playlist", "episode", "show", "artist"];
    const at = parts.findIndex((p) => kinds.includes(p));
    const type = at >= 0 ? parts[at] : undefined;
    const id = at >= 0 ? parts[at + 1] : undefined;
    if (type && id) {
      return video(`https://open.spotify.com/embed/${type}/${id}`, "Track on Spotify");
    }
    return null;
  }

  if (host === "soundcloud.com" && parts.length >= 2) {
    const target = encodeURIComponent(`https://soundcloud.com/${parts.join("/")}`);
    return video(
      `https://w.soundcloud.com/player/?url=${target}&color=%23000000&hide_related=true`,
      "Track on SoundCloud",
    );
  }

  if (host === "reddit.com" || host === "old.reddit.com") {
    if (parts[0] === "r" && parts[2] === "comments") {
      return {
        src: `https://www.redditmedia.com/${parts.join("/")}/?embed=true&ref_source=embed&theme=dark`,
        kind: "Thread on Reddit",
      };
    }
    return null;
  }

  if (host === "tiktok.com") {
    const at = parts.indexOf("video");
    const id = at >= 0 ? parts[at + 1] : undefined;
    if (id && /^\d+$/.test(id)) {
      return video(`https://www.tiktok.com/embed/v2/${id}`, "Video on TikTok");
    }
    return null;
  }

  if (host === "instagram.com" && (parts[0] === "p" || parts[0] === "reel") && parts[1]) {
    return { src: `https://www.instagram.com/p/${parts[1]}/embed`, kind: "Post on Instagram" };
  }

  if (host === "archive.org" && parts[0] === "details" && parts[1]) {
    return video(`https://archive.org/embed/${parts[1]}`, "Item on the Internet Archive");
  }

  return null;
}

function video(src: string, kind: string): Embed {
  return { src, kind, allow: PLAYER_ALLOW };
}
