import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";

type NavButtonProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function NavButton({ icon: Icon, label, active = false, onPress }: NavButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onPress}
      whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.88 }}
      transition={
        reduceMotion
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 620, damping: 26, mass: 0.6 }
      }
      className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl bg-transparent"
      style={{ color: active ? "var(--app-accent)" : "var(--app-chrome-muted)" }}
    >
      <Icon aria-hidden="true" strokeWidth={active ? 2.4 : 1.9} className="size-[22px]" />
      <span className="text-[10px] leading-none font-medium tracking-tight">{label}</span>
    </motion.button>
  );
}
