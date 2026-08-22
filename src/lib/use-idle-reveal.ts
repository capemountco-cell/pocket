import { useEffect, useRef, useState } from "react";

/**
 * True once nothing has happened for a while, false again the moment
 * something does.
 *
 * For chrome that should not sit over a site while it is being used, but
 * should be there when the reader settles. The discovery screen is almost
 * entirely somebody else's page, so anything the app puts on top of it has to
 * earn its place by being absent most of the time.
 *
 * What "activity" can mean here is bounded by the frame. A cross-origin iframe
 * fires no events into this document -- a tap, a scroll or a keystroke inside
 * the site is invisible from out here, and no amount of listening changes
 * that. What is observable:
 *
 *   - pointer, wheel, key and scroll events anywhere in the app's own layer
 *   - the window losing focus, which is what happens the first time someone
 *     touches the frame: focus moves into it and this document blurs
 *
 * The gap is real and worth naming: once focus is already inside the frame,
 * further scrolling in there produces no signal, so the reveal will happen
 * while someone is reading. That is the intended behaviour rather than a
 * defect -- reading is exactly when a quiet way back is wanted -- but it does
 * mean this measures quiet in the app, not quiet on the page.
 */

// Everything the app's own layer can hear. Captured, so a handler that stops
// propagation somewhere inside cannot make the screen look idle.
const ACTIVITY = [
  "pointerdown",
  "pointermove",
  "wheel",
  "keydown",
  "touchstart",
  "scroll",
] as const;

export function useIdleReveal(delayMs: number, resetKey: unknown, enabled = true): boolean {
  const [visible, setVisible] = useState(false);
  // Mirrors `visible` so the listeners can tell whether a state write is
  // needed. Without it every pointermove would set state, hundreds a second.
  const showing = useRef(false);

  useEffect(() => {
    showing.current = false;
    setVisible(false);
    if (!enabled || typeof window === "undefined") return;

    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        showing.current = true;
        setVisible(true);
      }, delayMs);
    };
    const stir = () => {
      if (showing.current) {
        showing.current = false;
        setVisible(false);
      }
      arm();
    };

    arm();
    const opts = { passive: true, capture: true } as const;
    for (const name of ACTIVITY) window.addEventListener(name, stir, opts);
    // Fires when the frame takes focus, which is the one thing a tap inside
    // the site does tell us about.
    window.addEventListener("blur", stir);

    return () => {
      window.clearTimeout(timer);
      for (const name of ACTIVITY) window.removeEventListener(name, stir, opts);
      window.removeEventListener("blur", stir);
    };
  }, [delayMs, resetKey, enabled]);

  return visible;
}
