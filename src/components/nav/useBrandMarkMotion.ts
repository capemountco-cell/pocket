import { useEffect, useRef } from "react";

// Drives the brand mark's two animations, and forwards the rendered node out
// to the caller's own logoRef (which may be a function ref or a ref object,
// e.g. from a parent that also needs the DOM node). Shared by ClassicNav and
// ModernNav so both trigger the exact same behavior on the exact same mark.
//
// The two are separate on purpose, and they mean different things:
//
//   spin   a full 1080deg turn, on a user-initiated advance -- the mark is
//          the button that was just pressed, and the spin is its receipt
//   pulse  a short scale flash, when the site on screen is liked
//
// They must never fire together. Both animate `transform` on the same node,
// so whichever class the cascade resolves last simply wins and the other is
// silently dropped -- which is how the spin went missing in the first place.
export function useBrandMarkMotion(
  {
    spinKey,
    pulseKey,
  }: {
    spinKey?: number | undefined;
    pulseKey?: number | undefined;
  },
  logoRef?: React.Ref<HTMLSpanElement>,
) {
  const innerLogoRef = useRef<HTMLSpanElement | null>(null);
  const lastSpinRef = useRef<number>(spinKey ?? 0);
  const lastPulseRef = useRef<number>(pulseKey ?? 0);

  // Removing the class, forcing a reflow, then re-adding it is what restarts a
  // CSS animation that is already running -- without the reflow the browser
  // coalesces both writes and nothing happens on a second tap.
  function restart(className: string) {
    const el = innerLogoRef.current;
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  useEffect(() => {
    const key = spinKey ?? 0;
    if (key === lastSpinRef.current) return;
    lastSpinRef.current = key;
    restart("logo-spin");
  }, [spinKey]);

  useEffect(() => {
    const key = pulseKey ?? 0;
    if (key === lastPulseRef.current) return;
    lastPulseRef.current = key;
    restart("logo-pulse");
  }, [pulseKey]);

  function setLogoRefs(el: HTMLSpanElement | null) {
    innerLogoRef.current = el;
    if (typeof logoRef === "function") logoRef(el);
    else if (logoRef && typeof logoRef === "object") {
      (logoRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
    }
  }

  return setLogoRefs;
}
