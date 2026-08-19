import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { NAV_DOCK_HEIGHT, NAV_Z_INDEX, SAFE_BOTTOM_PAD } from "@/lib/nav-style";
import { BrandMark } from "./BrandMark";
import { NavButton } from "./NavButton";
import type { NavSlot } from "./useNavActions";

/**
 * Compact floating dock. Translucent and tinted off the same --app-chrome-*
 * tokens via color-mix(), so it re-themes automatically. Auto-hides on scroll
 * down; returns on scroll up or on tap.
 */
export function ModernNav({ slots }: { slots: NavSlot[] }) {
  const reduceMotion = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) > 6) {
        setHidden(delta > 0 && y > 24);
        lastY.current = y;
      }
    };
    const reveal = () => setHidden(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", reveal);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", reveal);
    };
  }, []);

  return (
    <motion.nav
      aria-label="Primary"
      animate={
        reduceMotion
          ? { opacity: hidden ? 0 : 1, y: 0 }
          : { y: hidden ? 96 : 0, opacity: hidden ? 0 : 1 }
      }
      initial={false}
      transition={
        reduceMotion
          ? { duration: 0.18 }
          : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
      }
      className="chrome-blur fixed inset-x-3 rounded-[26px] border"
      style={{
        zIndex: NAV_Z_INDEX,
        bottom: SAFE_BOTTOM_PAD,
        borderColor: "color-mix(in oklab, var(--app-chrome-fg) 12%, transparent)",
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      <ul
        className="grid grid-cols-[1fr_1fr_1.65fr_1fr_1fr] items-center px-1.5"
        style={{ minHeight: NAV_DOCK_HEIGHT }}
      >
        {slots.map((slot) => (
          <li key={slot.id} className="flex justify-center">
            {slot.kind === "brand" ? (
              <BrandMark label={slot.label} onPress={slot.onPress} />
            ) : (
              <NavButton
                icon={slot.icon}
                label={slot.label}
                active={slot.active}
                onPress={slot.onPress}
              />
            )}
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}
