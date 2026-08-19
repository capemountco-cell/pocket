import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Shuffle } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { getDeviceId } from "@/lib/device-id";
import { applyTheme, readStoredTheme } from "@/lib/theme";
import { navContentReserve, readStoredNavStyle, type NavStyle } from "@/lib/nav-style";
import { SEED_SITES } from "@/data/seed-sites";
import { BottomNav } from "@/components/nav/BottomNav";
import { DiscoveryCard } from "@/components/DiscoveryCard";

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
      {
        property: "og:description",
        content: "A deliberate way to discover interesting corners of the web, one card at a time.",
      },
    ],
  }),
  component: DiscoveryScreen,
});

function DiscoveryScreen() {
  const reduceMotion = useReducedMotion();
  const [navStyle, setNavStyle] = useState<NavStyle>("modern");
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setNavStyle(readStoredNavStyle());
    applyTheme(readStoredTheme());
    getDeviceId();
  }, []);

  const site = SEED_SITES[index % SEED_SITES.length]!;

  const discover = useCallback(() => {
    setStarted(true);
    setIndex((i) => {
      if (SEED_SITES.length < 2) return i;
      let next = i;
      while (next === i) next = Math.floor(Math.random() * SEED_SITES.length);
      return next;
    });
  }, []);

  const reserve = useMemo(() => navContentReserve(navStyle), [navStyle]);

  return (
    <main
      className="mx-auto w-full max-w-[430px] px-4"
      style={{
        paddingTop: "max(20px, env(safe-area-inset-top))",
        paddingBottom: `calc(${reserve} + 84px)`,
      }}
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] leading-tight font-semibold tracking-tight">
            {APP_NAME}
          </h1>
          <p className="truncate text-[12px]" style={{ color: "var(--app-chrome-muted)" }}>
            {APP_TAGLINE}
          </p>
        </div>
        <span
          className="hairline shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ color: "var(--app-chrome-muted)" }}
        >
          {SEED_SITES.length} picks
        </span>
      </header>

      <section className="mt-4">
        {started ? (
          <DiscoveryCard site={site} />
        ) : (
          <div
            className="hairline rounded-3xl p-6 text-center"
            style={{ backgroundColor: "var(--app-surface)" }}
          >
            <h2 className="text-[18px] font-semibold tracking-tight">Ready when you are</h2>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--app-chrome-muted)" }}>
              One site at a time, hand-picked. No feed to fall into.
            </p>
          </div>
        )}
      </section>

      <motion.button
        type="button"
        aria-label={started ? "Show me another site" : "Show me a site"}
        onClick={discover}
        whileTap={reduceMotion ? { opacity: 0.75 } : { scale: 0.96 }}
        transition={
          reduceMotion
            ? { duration: 0.12 }
            : { type: "spring", stiffness: 540, damping: 26, mass: 0.6 }
        }
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
        style={{ backgroundColor: "var(--app-accent)", color: "var(--app-accent-contrast)" }}
      >
        <Shuffle aria-hidden="true" className="size-5" />
        {started ? "Show me another" : "Show me something"}
      </motion.button>

      <BottomNav navStyle={navStyle} onDiscover={discover} />
    </main>
  );
}
