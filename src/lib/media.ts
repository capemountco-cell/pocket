/**
 * A link that IS a picture or a film, rather than a page containing one.
 *
 * A screenshot of a gif is a still of a gif, which is the one thing a gif is
 * not. Where the address points straight at media, the card shows the media --
 * so a saved animation animates and a saved clip plays, in the list, without
 * anyone opening anything.
 *
 * Read from the path only. A HEAD request per card to ask the server what it
 * is would be a request per card, and this is a list that already pays for a
 * screenshot per row; the extension is right often enough and a wrong guess
 * falls back to the screenshot on error.
 */
export type MediaKind = "image" | "video" | null;

export function mediaKindOf(url: string): MediaKind {
  let path = "";
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return null;
  }
  if (/\.(gif|apng|webp|png|jpe?g|avif)$/.test(path)) return "image";
  if (/\.(mp4|webm|ogv|mov|m4v)$/.test(path)) return "video";
  return null;
}
