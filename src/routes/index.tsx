import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { getDeviceId } from "@/lib/device-id";
import { initTheme } from "@/lib/theme";
import { initNavStyle, useNavStyle } from "@/lib/nav-style";
import { navContentReserve } from "@/components/nav/navMetrics";
import { SEED_SITES } from "@/data/seed-sites";
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
  const [index, setIndex] = useState(0);
  const [reacted, setReacted] = useState(false);
  const [logoPulseKey, setLogoPulseKey] = useState(0);

  useEffect(() => {
    initTheme();
    initNavStyle();
    getDeviceId();
  }, []);

  const site = SEED_SITES[index]!;

  const discover = useCallback(() => {
    setReacted(false);
    setLogoPulseKey((k) => k + 1);
    setIndex((i) => {
      if (SEED_SITES.length < 2) return i;
      let next = i;
      while (next === i) next = Math.floor(Math.random() * SEED_SITES.length);
      return next;
    });
  }, []);

  // Placeholder slot handlers. Each becomes a sheet in a later milestone --
  // the slot's meaning and position never change, only what it opens.
  const soon = (what: string) => () => toast(`${what} arrives in a later pass.`);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        paddingBottom: navContentReserve(navStyle),
        boxSizing: "border-box",
        background: "#000000",
      }}
    >
      <SiteViewer site={site} />

      <BottomNav
        onNav={soon("The menu")}
        onReact={() => {
          setReacted((r) => !r);
          toast(reacted ? "Reaction cleared" : "Liked");
        }}
        onDiscover={discover}
        onSendTo={soon("Send to")}
        onSubmit={soon("Submitting a site")}
        siteUrl={site.url}
        siteTitle={site.title}
        reactActive={reacted}
        logoPulseKey={logoPulseKey}
      />
    </main>
  );
}
