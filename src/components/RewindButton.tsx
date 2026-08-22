import { RotateCcw } from "lucide-react";
import { useReducedMotion } from "motion/react";

/**
 * One step back through the sites you have been shown.
 *
 * The loop is a one-way tap by design, and that is the whole shape of the
 * product -- but a one-way tap with no way back turns a mis-tap into a site
 * you can never see again. This is the undo for that, and nothing more: it
 * walks the trail this session has already served, so it never spends a new
 * site and never re-marks one as seen.
 *
 * It sits over somebody else's page, so it is built to disappear. Translucent
 * and blurred rather than filled, which reads on a dark site and a light one
 * without knowing which it is on, and shown only once the screen has been
 * quiet for a moment (see useIdleReveal).
 *
 * Not in the bottom bar. The bar's five slots are fixed and their meanings are
 * muscle memory; a sixth that comes and goes would break both.
 */
export function RewindButton({ visible, onRewind }: { visible: boolean; onRewind: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <button
      type="button"
      onClick={onRewind}
      aria-label="Back to the previous site"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        position: "absolute",
        right: 16,
        bottom: 16,
        zIndex: 2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 46,
        height: 46,
        borderRadius: 999,
        // Neither black nor white: a dark wash under a blur sits on a pink
        // masthead and a black terminal equally, and the hairline gives it an
        // edge on both. Nothing here is opaque.
        background: "rgba(10,10,12,0.30)",
        backdropFilter: "blur(12px) saturate(120%)",
        WebkitBackdropFilter: "blur(12px) saturate(120%)",
        border: "1px solid rgba(255,255,255,0.22)",
        color: "rgba(255,255,255,0.92)",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        opacity: visible ? 1 : 0,
        // Sinks a few pixels when it leaves, so it reads as withdrawing rather
        // than blinking out.
        transform: visible ? "translateY(0)" : "translateY(6px)",
        pointerEvents: visible ? "auto" : "none",
        transition: reduceMotion ? "none" : "opacity 220ms ease, transform 220ms ease",
      }}
    >
      <RotateCcw size={20} aria-hidden="true" />
    </button>
  );
}
