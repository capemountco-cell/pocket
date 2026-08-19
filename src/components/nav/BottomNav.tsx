import { useNavStyle } from "@/lib/nav-style";
import { ClassicNav } from "@/components/nav/ClassicNav";
import { ModernNav } from "@/components/nav/ModernNav";
import { NAV_BALANCED_PAD, NAV_HEIGHT } from "@/components/nav/navMetrics";
import type { BottomNavProps } from "@/components/nav/types";

// navContentReserve() is a layout helper, not nav chrome -- pages import it
// straight from nav/navMetrics instead of through this barrel, so this file
// only re-exports plain constants alongside the component.
export { NAV_BALANCED_PAD, NAV_HEIGHT };
export type { BottomNavProps } from "@/components/nav/types";

// Presentation switch only -- both ClassicNav and ModernNav consume the exact
// same useNavActions() logic, so switching styles here can never fork what a
// tap on a slot actually does, only how the nav looks and moves. Never
// duplicate business logic in a new nav style; extend useNavActions instead.
//
// Sheets, once they exist, are rendered HERE as siblings of the nav, never
// inside it: the Modern bar carries a backdrop-filter and animated transform,
// either of which makes it the containing block for position:fixed
// descendants -- a sheet nested inside it would open *inside* the bar instead
// of over the screen.
export function BottomNav(props: BottomNavProps) {
  const navStyle = useNavStyle();
  return navStyle === "modern" ? <ModernNav {...props} /> : <ClassicNav {...props} />;
}
