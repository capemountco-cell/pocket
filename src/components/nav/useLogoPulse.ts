import { useEffect, useRef } from "react";

// Drives the brand mark's "pulse" flash whenever logoPulseKey increments, and
// forwards the rendered node out to the caller's own logoRef (which may be a
// function ref or a ref object, e.g. from a parent that also needs the DOM
// node). Shared by ClassicNav and ModernNav so both trigger the exact same
// pulse behavior on the exact same brand mark.
export function useLogoPulse(
  logoPulseKey: number | undefined,
  logoRef?: React.Ref<HTMLSpanElement>,
) {
  const innerLogoRef = useRef<HTMLSpanElement | null>(null);
  const lastPulseRef = useRef<number>(logoPulseKey ?? 0);

  useEffect(() => {
    const key = logoPulseKey ?? 0;
    if (key === lastPulseRef.current) return;
    lastPulseRef.current = key;
    const el = innerLogoRef.current;
    if (!el) return;
    el.classList.remove("logo-pulse");
    void el.offsetWidth;
    el.classList.add("logo-pulse");
  }, [logoPulseKey]);

  function setLogoRefs(el: HTMLSpanElement | null) {
    innerLogoRef.current = el;
    if (typeof logoRef === "function") logoRef(el);
    else if (logoRef && typeof logoRef === "object") {
      (logoRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
    }
  }

  return setLogoRefs;
}
