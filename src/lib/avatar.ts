import { supabase } from "@/integrations/supabase/client";

/**
 * The picture on your account.
 *
 * ---------------------------------------------------------------------------
 * Where the picture lives, and why it is not in a bucket
 *
 * The obvious home for an uploaded image is Storage, and this project already
 * has a bucket -- `screenshots` -- so the machinery exists. There is no bucket
 * for avatars, and one cannot be created from the app: making a bucket and its
 * policies is a schema change, and the client holds a publishable key that is
 * deliberately not allowed to make one.
 *
 * Measured against the live project rather than assumed, as an ordinary signed
 * in user:
 *
 *   POST /storage/v1/object/avatars/…     404 NoSuchBucket
 *   POST /storage/v1/object/screenshots/… 403 "new row violates row-level
 *                                             security policy"
 *
 * The second line is what makes the first one trustworthy: a bucket that
 * exists but refuses the write answers differently from one that is not there.
 *
 * So the picture is carried in `profiles.avatar_url` itself, as a data URI.
 * That column is text, the owner may write it -- also measured: a PATCH of
 * one's own row returns the updated row -- and every place that shows an
 * avatar already renders whatever is in it, so nothing downstream changes.
 *
 * The cost is real and is why the ceiling below is strict: this makes the
 * profile row carry its own picture, and a profile row is read on every load.
 * A 256px square is the largest thing any surface in this app draws at (46px
 * at 3x is 138px, so 256 covers it with room), and the encoder steps down
 * until the whole string fits in 48 KB. When a bucket exists, only `store`
 * below changes -- everything else already speaks in URLs.
 */

/** The longest edge kept. 46px at 3x is 138px; this covers every surface. */
const MAX_EDGE = 256;

/**
 * The most a data URI may weigh.
 *
 * Not a guess: base64 costs a third on top, so 48 KB of string is about 36 KB
 * of image -- generous for a 256px square, and small enough that a profile
 * fetch does not become a download.
 */
const MAX_BYTES = 48 * 1024;

/** Encoder qualities to try, high to low, before shrinking the square. */
const QUALITIES = [0.82, 0.7, 0.6, 0.5, 0.4];

/** What a file has to be under before it is even decoded. */
const MAX_SOURCE_BYTES = 24 * 1024 * 1024;

export type AvatarError =
  "not-an-image" | "too-large" | "unreadable" | "no-account" | "save-failed";

export class AvatarFailure extends Error {
  constructor(readonly reason: AvatarError) {
    super(reason);
    this.name = "AvatarFailure";
  }
}

/**
 * A file from the picker, as a square data URI small enough to store.
 *
 * Decoded through an <img> rather than createImageBitmap because that is what
 * every browser can do with every format it can display -- including the HEIC
 * that an iPhone hands over, which createImageBitmap refuses.
 */
export async function squareDataUri(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new AvatarFailure("not-an-image");
  if (file.size > MAX_SOURCE_BYTES) throw new AvatarFailure("too-large");

  const url = URL.createObjectURL(file);
  try {
    const image = await load(url);
    // Centre crop to a square first, so a portrait photograph becomes a face
    // rather than a face with the top of a head missing.
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (side === 0) throw new AvatarFailure("unreadable");
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;

    for (const edge of [MAX_EDGE, 192, 160, 128]) {
      const canvas = document.createElement("canvas");
      canvas.width = edge;
      canvas.height = edge;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new AvatarFailure("unreadable");
      ctx.drawImage(image, sx, sy, side, side, 0, 0, edge, edge);

      for (const quality of QUALITIES) {
        const encoded = encode(canvas, quality);
        if (encoded.length <= MAX_BYTES) return encoded;
      }
    }
    // Every size and quality still too heavy. Vanishingly unlikely at 128px,
    // but a silent oversized write into a row read on every load is worse
    // than saying no.
    throw new AvatarFailure("too-large");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * WebP where it is available, JPEG where it is not.
 *
 * toDataURL does not report a refusal: a canvas asked for a format it cannot
 * write answers with PNG and says nothing. PNG of a photograph is several
 * times the size of either, so the prefix is checked rather than trusted --
 * and JPEG, which every canvas can write, is the fallback.
 */
function encode(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", quality);
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new AvatarFailure("unreadable"));
    image.src = src;
  });
}

/**
 * Write the picture to the account, or clear it.
 *
 * A direct write rather than an RPC because the row is the writer's own and
 * the policy already allows exactly this -- see the note at the top. Nothing
 * else about the profile is touched.
 */
export async function storeAvatar(userId: string, avatar: string | null): Promise<void> {
  if (!userId) throw new AvatarFailure("no-account");
  const { error } = await supabase.from("profiles").update({ avatar_url: avatar }).eq("id", userId);
  if (error) throw new AvatarFailure("save-failed");
}

/** What to tell someone when it did not work. */
export function avatarMessage(error: unknown): string {
  const reason = error instanceof AvatarFailure ? error.reason : "save-failed";
  switch (reason) {
    case "not-an-image":
      return "That file is not a picture.";
    case "too-large":
      return "That picture is too big to store.";
    case "unreadable":
      return "That picture could not be read.";
    case "no-account":
      return "Sign in first.";
    default:
      return "That did not save. Try again.";
  }
}
