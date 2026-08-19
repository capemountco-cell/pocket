import { motion, useReducedMotion, type Transition } from "motion/react";
import { ICON_REGISTRY, ICON_SOURCE_SIZE } from "./registry";
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
// Shared visual primitive behind every semantic icon (MenuIcon, ReactIcon,
// ...). Renders only each action's accent symbol -- the mascot figure in the
// source sheet is deliberately not shown in the bar. Handles state animation
// only; press/hover/click wiring lives one level up in the nav button that
// hosts it.
export function AppIcon({ name, state = "idle", size = 34, glowKey, className }: AppIconProps) {
  const { src, accentColor, accent } = ICON_REGISTRY[name];
  const reduceMotion = useReducedMotion();

  // Crop-and-zoom math: the source raster bakes the symbol into a flat
  // 512x512 canvas with a lot of surrounding whitespace, at a different scale
  // per icon. The symbol's own bounding box (see registry.ts) is scaled to the
  // target size, then the full image is shifted behind an overflow:hidden
  // window so only the symbol shows.
  const scale = size / Math.max(accent.w, accent.h);
  const renderW = accent.w * scale;
  const renderH = accent.h * scale;
  const imgSize = ICON_SOURCE_SIZE * scale;

  const isLoading = state === "loading" && !reduceMotion;
  const isSuccess = state === "success" && !reduceMotion;
  const glowPx = ACCENT_GLOW_PX[state];

  return (
    <motion.span
      className={className}
      style={{
        position: "relative",
        display: "inline-flex",
        width: renderW,
        height: renderH,
        flex: "0 0 auto",
      }}
      variants={GROUP_VARIANTS}
      animate={state}
      transition={reduceMotion ? { duration: 0 } : SPRING}
    >
      {/* Symbol: solid fill, recolored via CSS mask -- always the icon's
          assigned accent color, in every state. */}
      <motion.span
        key={glowKey ?? 0}
        aria-hidden="true"
        className={glowKey && glowKey > 0 ? "press-glow" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
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
        <span
          style={{
            position: "absolute",
            left: -accent.x * scale,
            top: -accent.y * scale,
            width: imgSize,
            height: imgSize,
            backgroundColor: accentColor,
            WebkitMaskImage: `url(${src})`,
            maskImage: `url(${src})`,
            WebkitMaskSize: `${imgSize}px ${imgSize}px`,
            maskSize: `${imgSize}px ${imgSize}px`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "0 0",
            maskPosition: "0 0",
          }}
        />
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
