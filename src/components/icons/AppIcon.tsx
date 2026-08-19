import { motion, useReducedMotion, type Transition } from "motion/react";
import { ICON_REGISTRY, ICON_VIEWBOX } from "./registry";
import type { IconName, IconState } from "./types";

// Scale applied to the symbol per state. Kept subtle and fast per the
// "premium, not bouncy" brief.
const GROUP_VARIANTS: Record<IconState, { scale: number }> = {
  idle: { scale: 1 },
  pressed: { scale: 0.88 },
  active: { scale: 1.05 },
  disabled: { scale: 1 },
  loading: { scale: 1 },
  success: { scale: 1.08 },
};

const LAYER_OPACITY: Record<IconState, number> = {
  idle: 1,
  pressed: 1,
  active: 1,
  disabled: 0.35,
  loading: 0.6,
  success: 1,
};

const ACCENT_GLOW_PX: Record<IconState, number> = {
  idle: 0,
  pressed: 5,
  active: 7,
  disabled: 0,
  loading: 0,
  success: 10,
};

const SPRING: Transition = { type: "spring", stiffness: 520, damping: 26, mass: 0.6 };

export type AppIconProps = {
  name: IconName;
  state?: IconState | undefined;
  // Visual size of the symbol's longest edge, in px.
  size?: number | undefined;
  // Bump to flash the "press-glow" highlight (e.g. new content).
  glowKey?: number | undefined;
  className?: string | undefined;
};

// Shared visual primitive behind every semantic icon (MenuIcon, ReactIcon,
// ...). Handles state animation only — press/hover/click wiring lives one
// level up in the nav button that hosts it.
export function AppIcon({ name, state = "idle", size = 34, glowKey, className }: AppIconProps) {
  const { accentColor, paths, strokeWidth = 1.9, filled } = ICON_REGISTRY[name];
  const reduceMotion = useReducedMotion();

  const isLoading = state === "loading" && !reduceMotion;
  const isSuccess = state === "success" && !reduceMotion;
  const glowPx = ACCENT_GLOW_PX[state];

  return (
    <motion.span
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        width: size,
        height: size,
        flex: "0 0 auto",
      }}
      variants={GROUP_VARIANTS}
      animate={state}
      transition={reduceMotion ? { duration: 0 } : SPRING}
    >
      <motion.span
        key={glowKey ?? 0}
        aria-hidden="true"
        className={glowKey && glowKey > 0 ? "press-glow" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          ["--glow-color" as never]: accentColor,
          ["--glow-shadow" as never]: `${accentColor}bf`,
        }}
        animate={
          isLoading
            ? { opacity: [0.35, 0.7, 0.35], filter: "none" }
            : {
                opacity: LAYER_OPACITY[state],
                filter: glowPx ? `drop-shadow(0 0 ${glowPx}px ${accentColor})` : "none",
              }
        }
        transition={
          isLoading ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }
        }
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
          fill="none"
          aria-hidden="true"
          style={{ display: "block" }}
        >
          {paths.map((d) => (
            <path
              key={d}
              d={d}
              stroke={accentColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {filled?.map((d) => (
            <path key={d} d={d} fill={accentColor} />
          ))}
        </svg>
      </motion.span>

      {isSuccess && (
        <motion.span
          aria-hidden="true"
          initial={{ scale: 0.6, opacity: 0.6 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: 999,
            border: `2px solid ${accentColor}`,
            pointerEvents: "none",
          }}
        />
      )}
    </motion.span>
  );
}
