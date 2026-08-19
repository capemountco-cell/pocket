import { useMemo } from "react";
import { useNavStyle } from "@/lib/nav-style";
import { ClassicNav } from "@/components/nav/ClassicNav";
import { ModernNav } from "@/components/nav/ModernNav";
import { NavSheets } from "@/components/nav/NavSheets";
import { useNavActions } from "@/components/nav/useNavActions";
import { NAV_BALANCED_PAD, NAV_HEIGHT } from "@/components/nav/navMetrics";
import { SEED_SITES } from "@/data/seed-sites";
import type { BottomNavProps } from "@/components/nav/types";

// navContentReserve() is a layout helper, not nav chrome -- pages import it
// straight from nav/navMetrics instead of through this barrel, so this file
// only re-exports plain constants alongside the component.
export { NAV_BALANCED_PAD, NAV_HEIGHT };
export type { BottomNavProps } from "@/components/nav/types";

// Presentation switch only -- ClassicNav and ModernNav are handed the exact
// same slot handlers, built once by useNavActions() here, so switching styles
// can never fork what a tap on a slot actually does, only how the nav looks
// and moves. Never duplicate business logic in a new nav style; extend
// useNavActions instead.
//
// Sheets are rendered HERE as siblings of the nav, never inside it: an
// animated transform or backdrop-filter on the bar makes it the containing
// block for position:fixed descendants -- a sheet nested inside it would open
// *inside* the bar instead of over the screen.
export function BottomNav(props: BottomNavProps) {
  const navStyle = useNavStyle();
  const { slots, activeSheet, setActiveSheet, closeSheet, prefs } = useNavActions(props);
  const { site, onShowSite, ...chrome } = props;

  // Saved ids resolve against everything servable: the seed deck plus
  // anything submitted on this device.
  const savedSites = useMemo(() => {
    const known = [...SEED_SITES, ...prefs.submitted];
    return prefs.savedIds
      .map((id) => known.find((s) => s.id === id))
      .filter((s): s is (typeof known)[number] => Boolean(s));
  }, [prefs.savedIds, prefs.submitted]);

  return (
    <>
      {navStyle === "modern" ? (
        <ModernNav {...chrome} slots={slots} />
      ) : (
        <ClassicNav {...chrome} slots={slots} />
      )}

      <NavSheets
        activeSheet={activeSheet}
        setActiveSheet={setActiveSheet}
        closeSheet={closeSheet}
        site={site}
        prefs={prefs}
        savedSites={savedSites}
        isSaved={slots.isSaved}
        onShowSite={onShowSite ?? (() => {})}
      />
    </>
  );
}
