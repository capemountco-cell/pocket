import { motion, useReducedMotion } from "motion/react";
import { Compass } from "lucide-react";

type BrandMarkProps = {
  label: string;
  onPress: () => void;
};

/** The wider center slot: the deliberate advance action. */
export function BrandMark({ label, onPress }: BrandMarkProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onPress}
      whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.9 }}
      transition={
        reduceMotion
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 560, damping: 24, mass: 0.6 }
      }
      className="mx-auto flex min-h-11 w-full max-w-[76px] items-center justify-center gap-1.5 rounded-full px-3 py-2.5"
      style={{
        backgroundColor: "var(--app-accent)",
        color: "var(--app-accent-contrast)",
      }}
    >
      <Compass aria-hidden="true" strokeWidth={2.2} className="size-5" />
      <span className="text-[11px] leading-none font-semibold tracking-tight">{label}</span>
    </motion.button>
  );
}
