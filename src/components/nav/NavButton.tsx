import { motion, useReducedMotion } from "motion/react";

// Shared tap-target primitive for every non-brand slot in both nav styles.
// Owns the 44px minimum hit area and the spring press/hover feedback so
// ClassicNav and ModernNav can't drift apart on motion or accessibility.
export const NAV_TAP_TARGET = 44;

export function NavButton({
  children,
  label,
  onClick,
  active,
  disabled,
  ink,
  fontSize = 16,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean | undefined;
  /** Nothing for this slot to act on. Dimmed and inert, never removed. */
  disabled?: boolean | undefined;
  ink: string;
  fontSize?: number | undefined;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      // Spread rather than pass `undefined`: this project compiles with
      // exactOptionalPropertyTypes, which rejects an explicit undefined for
      // an optional prop. Omitting the keys entirely is the same behavior.
      {...(reduceMotion || disabled
        ? {}
        : { whileTap: { scale: 0.88 }, whileHover: { scale: 1.05 } })}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      aria-label={label}
      aria-pressed={active ? true : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: NAV_TAP_TARGET,
        minHeight: NAV_TAP_TARGET,
        height: "100%",
        background: "transparent",
        border: 0,
        color: ink,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize,
        cursor: disabled ? "default" : "pointer",
        // Dimmed rather than hidden. The bar is five fixed meanings in fixed
        // places and muscle memory is the point of that, so a slot with
        // nothing to act on goes quiet where it stands.
        opacity: disabled ? 0.34 : 1,
        padding: "0 5px",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </motion.button>
  );
}
