import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { getDeviceId } from "@/lib/device-id";
import { initTheme } from "@/lib/theme";
import { initNavStyle, useNavStyle } from "@/lib/nav-style";
import { initSitePrefs, useSitePrefs } from "@/lib/site-prefs";
import { navContentReserve } from "@/components/nav/navMetrics";
import { SEED_SITES, type DiscoverySite } from "@/data/seed-sites";
import { BottomNav } from "@/components/nav/BottomNav";
import { SiteViewer } from "@/components/SiteViewer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — find one good corner of the web` },
      {
        name: "description",
        content:
          "Tap once and get a single hand-picked site, full screen. React to it, collect it, discuss it, send it on — then tap for the next one.",
      },
      { property: "og:title", content: `${APP_NAME} — one tap, one site` },
      { property: "og:description", content: APP_TAGLINE },
    ],
  }),
  component: DiscoveryScreen,
});

function DiscoveryScreen() {
  const navStyle = useNavStyle();
  const prefs = useSitePrefs();
  const [siteId, setSiteId] = useState<string>(() => SEED_SITES[0]?.id ?? "");
  const [logoPulseKey, setLogoPulseKey] = useState(0);

  useEffect(() => {
    initTheme();
    initNavStyle();
    initSitePrefs();
    getDeviceId();
  }, []);

  // What this device can be served: the curated deck plus anything submitted
  // here, minus anything it asked never to see again.
  const deck = useMemo(() => {
    const all = [...SEED_SITES, ...prefs.submitted];
    const visible = all.filter((s) => !prefs.hiddenIds.includes(s.id));
    // Hiding the last visible site must not empty the screen.
    return visible.length > 0 ? visible : all;
  }, [prefs.submitted, prefs.hiddenIds]);

  // Identity, not index: the deck changes shape as sites are hidden or added,
  // and an index would silently point at a different site when it does.
  const site = deck.find((s) => s.id === siteId) ?? deck[0];

  const discover = useCallback(() => {
    setLogoPulseKey((k) => k + 1);
    setSiteId((currentId) => {
      if (deck.length < 2) return deck[0]?.id ?? currentId;
      let next = currentId;
      while (next === currentId) {
        next = deck[Math.floor(Math.random() * deck.length)]?.id ?? currentId;
      }
      return next;
    });
  }, [deck]);

  const showSite = useCallback((next: DiscoverySite) => {
    setLogoPulseKey((k) => k + 1);
    setSiteId(next.id);
  }, []);

  return (
    // The nav is a SIBLING of <main>, not a child. <main> is position:fixed,
    // which makes it a stacking context, and a z-index inside one can't
    // compete with anything outside it -- nested, the bar's z-index 50 would
    // lose to a portaled sheet and stop being the permanent overlay it is
    // supposed to be.
    <>
      <main
        style={{
          position: "fixed",
          inset: 0,
          paddingBottom: navContentReserve(navStyle),
          boxSizing: "border-box",
          background: "#000000",
        }}
      >
        {site ? <SiteViewer site={site} /> : null}
      </main>

      <BottomNav
        site={site}
        onDiscover={discover}
        onShowSite={showSite}
        logoPulseKey={logoPulseKey}
      />
    </>
  );
}
