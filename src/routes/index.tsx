import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/brand";
import { getDeviceId } from "@/lib/device-id";
import { initTheme } from "@/lib/theme";
import { initNavStyle, useNavStyle } from "@/lib/nav-style";
import { initSitePrefs } from "@/lib/site-prefs";
import { NAV_SLOT_EVENT, recordEvent } from "@/lib/discovery";
import { useDiscoveryDeck, type DeckStatus } from "@/lib/use-discovery-deck";
import { OPEN_SITE_KEY } from "@/routes/saved";
import { navContentReserve } from "@/components/nav/navMetrics";
import { BottomNav } from "@/components/nav/BottomNav";
import { SiteViewer } from "@/components/SiteViewer";

export const Route = createFileRoute("/")({
  // Title, description and the social card are set once in __root.tsx and
  // inherited here -- the discovery screen is the site's front door, so it has
  // nothing of its own to say that the root does not already say better.
  head: () => ({ meta: [] }),
  component: DiscoveryScreen,
});

function DiscoveryScreen() {
  const navStyle = useNavStyle();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [logoSpinKey, setLogoSpinKey] = useState(0);

  // Read once, synchronously, so the deck has it before its first fetch --
  // and consumed on read, so a later reload doesn't reopen the same site.
  const [requestedSiteId] = useState<string | null>(() => {
    if (typeof sessionStorage === "undefined") return null;
    try {
      const id = sessionStorage.getItem(OPEN_SITE_KEY);
      if (id) sessionStorage.removeItem(OPEN_SITE_KEY);
      return id;
    } catch {
      return null;
    }
  });

  // The device id only exists in the browser, so everything keyed off it —
  // the feed, this device's reactions, its collection — starts after mount
  // rather than during SSR.
  useEffect(() => {
    initTheme();
    initNavStyle();
    const id = getDeviceId();
    setDeviceId(id);
    if (id) void initSitePrefs(id);
  }, []);

  const { site, status, discover, showSite, restart, retry } = useDiscoveryDeck(
    deviceId,
    requestedSiteId,
  );

  const advance = () => {
    // The mark is the button that was just pressed, so it turns: a full
    // rotation is the receipt for the tap, and it lasts about as long as the
    // next site takes to arrive.
    setLogoSpinKey((k) => k + 1);
    discover();
  };

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
        {site ? (
          <SiteViewer site={site} />
        ) : (
          <DeckMessage
            status={status}
            onRestart={() => {
              if (deviceId) recordEvent(deviceId, "catalogue_restart");
              void restart();
            }}
            onRetry={retry}
          />
        )}
      </main>

      <BottomNav
        site={site ?? undefined}
        onDiscover={advance}
        {...(deviceId
          ? {
              onSlotTap: (slot) => {
                // `discover` deliberately has no entry — the serve itself is
                // already recorded server-side.
                const kind = NAV_SLOT_EVENT[slot as keyof typeof NAV_SLOT_EVENT];
                if (kind) recordEvent(deviceId, kind);
              },
            }
          : {})}
        logoSpinKey={logoSpinKey}
      />
    </>
  );
}

// The three states that are not "here is a site". Each says what happened and
// offers the one action that resolves it -- a blank screen with a spinner is
// not an answer to "the catalogue ran out".
function DeckMessage({
  status,
  onRestart,
  onRetry,
}: {
  status: DeckStatus;
  onRestart: () => void;
  onRetry: () => void;
}) {
  const copy =
    status === "unconfigured"
      ? {
          title: "The feed isn't connected",
          body: "Set VITE_SUPABASE_PUBLISHABLE_KEY in this deployment's environment and reload. Everything else works without it.",
          action: null,
        }
      : status === "error"
        ? {
            title: "Couldn't reach the feed",
            body: "The connection didn't answer. Your reactions and saved sites are safe.",
            action: { label: "Try again", run: onRetry },
          }
        : status === "empty"
          ? {
              title: "You've seen everything",
              body: `That's the whole catalogue for now. Start it over, or add a site ${APP_NAME} doesn't have yet.`,
              action: { label: "Start over", run: onRestart },
            }
          : { title: "Finding you a site…", body: "", action: null };

  return (
    <div
      role={status === "loading" ? "status" : "alert"}
      aria-live="polite"
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
        background: "var(--app-bg, #FAFAF7)",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 320 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--app-fg, #111111)",
          }}
        >
          {copy.title}
        </h2>
        {copy.body ? (
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 15,
              lineHeight: 1.5,
              color: "var(--app-fg-muted, #6B6B66)",
            }}
          >
            {copy.body}
          </p>
        ) : null}
        {copy.action ? (
          <button
            type="button"
            onClick={copy.action.run}
            style={{
              marginTop: 18,
              display: "inline-flex",
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              padding: "0 22px",
              borderRadius: 999,
              border: "1px solid var(--app-border, #E6E6E1)",
              background: "var(--app-chrome-bg, #000000)",
              color: "var(--app-chrome-fg, #ffffff)",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copy.action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
