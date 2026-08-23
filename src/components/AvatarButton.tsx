import { useRef, useState } from "react";
import { User } from "lucide-react";
import { toast } from "sonner";
import { avatarMessage, squareDataUri, storeAvatar } from "@/lib/avatar";
import type { AuthState } from "@/lib/auth";

/**
 * Your picture, and one tap to change it.
 *
 * The same control on the phone and on the desktop, because the difference is
 * the operating system's to make rather than ours: a hidden file input with
 * `accept="image/*"` opens the photo library on iOS and Android and a file
 * dialog everywhere else, off a single tap. No intermediate "upload" screen,
 * no drag target that a thumb cannot use.
 *
 * Signed out it is not a control at all. There is nowhere to keep a picture
 * without an account, and a button that opens a picker and then cannot save
 * is worse than a plain circle.
 */
export function AvatarButton({
  auth,
  size,
  onChanged,
}: {
  auth: AuthState;
  size: number;
  onChanged?: (() => void) | undefined;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const signedIn = Boolean(auth.session);
  const userId = auth.user?.id ?? auth.profile?.id ?? "";

  if (!signedIn) return <AvatarFace url={auth.profile?.avatar_url ?? null} size={size} />;

  const chosen = async (file: File | undefined) => {
    // Cleared here rather than after the await: picking the same file twice in
    // a row fires no change event unless the value is reset, and someone who
    // has just cropped a photo and picked it again is exactly the person who
    // would hit that.
    if (input.current) input.current.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await storeAvatar(userId, await squareDataUri(file));
      await auth.refreshProfile();
      toast("Picture updated");
      onChanged?.();
    } catch (error) {
      toast(avatarMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={auth.profile?.avatar_url ? "Change your picture" : "Add a picture"}
        style={{
          appearance: "none",
          padding: 0,
          border: 0,
          background: "transparent",
          borderRadius: 999,
          cursor: busy ? "default" : "pointer",
          WebkitTapHighlightColor: "transparent",
          lineHeight: 0,
          flex: "0 0 auto",
        }}
      >
        <AvatarFace url={auth.profile?.avatar_url ?? null} size={size} busy={busy} />
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        onChange={(e) => void chosen(e.target.files?.[0])}
        // Hidden from sight and from the tab order: the button above is the
        // control, and a second focus stop that looks like nothing is a trap.
        tabIndex={-1}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/** The circle itself: the picture, or the fallback glyph. */
export function AvatarFace({
  url,
  size,
  busy = false,
}: {
  url: string | null;
  size: number;
  busy?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        background: "var(--app-chrome-avatar, #1f1f1f)",
        color: "var(--app-chrome-muted, #9c9c97)",
        overflow: "hidden",
        flex: "0 0 auto",
        // Dims while the encoder is working, which on a large photograph is a
        // visible moment. The circle stays put rather than being replaced by a
        // spinner, so nothing moves.
        opacity: busy ? 0.5 : 1,
        transition: "opacity 160ms ease-out",
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "cover" }}
        />
      ) : (
        <User size={Math.round(size * 0.48)} aria-hidden="true" />
      )}
    </span>
  );
}
