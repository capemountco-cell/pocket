import { ClassicNav } from "./ClassicNav";
import { ModernNav } from "./ModernNav";
import { useNavActions } from "./useNavActions";
import type { NavStyle } from "@/lib/nav-style";

/** Thin presentation switch. No behaviour lives here. */
export function BottomNav({
  navStyle,
  onDiscover,
}: {
  navStyle: NavStyle;
  onDiscover: () => void;
}) {
  const slots = useNavActions({ onDiscover });
  return navStyle === "classic" ? <ClassicNav slots={slots} /> : <ModernNav slots={slots} />;
}
