import { EyeOff } from "lucide-react";

/**
 * The screen that stands in front of an adult site until someone asks for it.
 *
 * Adult sites are not refused any more. They sit in the rotation like anything
 * else, and this is what makes that acceptable: nobody is shown one without
 * having said, on this site, that they want to see it.
 *
 * It is a real gate, not a scrim. The frame behind it is not mounted while
 * this is up, so the page has not been fetched, nothing has loaded, and there
 * is no sound -- a blurred overlay over a live site would be none of those
 * things. The blur here is a flat gradient rather than the site's own picture,
 * for the same reason: a blurred version of the image is still the image.
 *
 * The button says what pressing it means. "Show" alone is a request; the age
 * is the part being asserted, so the button is where it belongs rather than
 * buried in the sentence above it.
 */
export function ContentWarning({ domain, onShow }: { domain: string; onShow: () => void }) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="content-warning-title"
      aria-describedby="content-warning-body"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 28px",
        boxSizing: "border-box",
        textAlign: "center",
        // Nothing of the site shows through, so this is its own surface rather
        // than a translucent layer over one.
        background:
          "radial-gradient(120% 90% at 50% 18%, #3a2a30 0%, #241c22 42%, #141014 78%, #0b090c 100%)",
        color: "#ffffff",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <EyeOff size={38} strokeWidth={1.75} aria-hidden="true" style={{ opacity: 0.95 }} />

      <h2
        id="content-warning-title"
        style={{
          margin: "22px 0 0",
          fontSize: 24,
          lineHeight: 1.2,
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        Content warning: Adult
      </h2>

      <p
        id="content-warning-body"
        style={{
          margin: "12px 0 0",
          maxWidth: 320,
          fontSize: 16,
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.72)",
        }}
      >
        This site is flagged as showing sensitive content.
      </p>

      {/* The address, so the choice is about a known place rather than an
          anonymous one. Quiet enough not to compete with the warning. */}
      <p
        style={{
          margin: "10px 0 0",
          fontSize: 13,
          letterSpacing: "0.02em",
          color: "rgba(255,255,255,0.44)",
          overflowWrap: "anywhere",
        }}
      >
        {domain}
      </p>

      <button
        type="button"
        onClick={onShow}
        style={{
          appearance: "none",
          // Centred under the warning, not tucked in a corner: it is the only
          // decision on this screen.
          margin: "30px 0 0",
          minHeight: 52,
          padding: "0 26px",
          borderRadius: 999,
          border: 0,
          background: "#ffffff",
          color: "#14100f",
          font: "inherit",
          fontSize: 16.5,
          fontWeight: 750,
          letterSpacing: "-0.01em",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        Show Me — I&rsquo;m over 18+
      </button>

      <p
        style={{
          margin: "16px 0 0",
          fontSize: 13,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.38)",
        }}
      >
        Or tap the logo below for something else.
      </p>
    </div>
  );
}
