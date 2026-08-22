import { useEffect, useMemo, useState } from "react";
import { ContentWarning } from "@/components/ContentWarning";
import {
  ADULT_PREF_EVENT,
  acknowledgeAdult,
  alwaysShowAdult,
  hasAcknowledgedAdult,
} from "@/lib/adult-consent";
import { embedFor } from "@/lib/embeds";
import { RewindButton } from "@/components/RewindButton";
import { useIdleReveal } from "@/lib/use-idle-reveal";
import type { DiscoverySite } from "@/lib/discovery";

// Renders one discovery full-bleed. Two presentation modes, equal in polish:
// an embedded frame for sites that allow it, and a branded preview card for
// sites that send X-Frame-Options / CSP frame-ancestors. A site is never
// rejected for refusing to be framed -- see the standing policy in the build
// brief; the header is respected, never bypassed.
// How long to wait for an embed before giving up on it. A cross-origin frame
// reports nothing when the origin is down or hanging -- no error event fires
// and onLoad may never come -- so a timeout is the only signal available
// until the submission pipeline can check liveness server-side.
const EMBED_TIMEOUT_MS = 8000;

// How long the screen has to stay quiet before the way back offers itself.
const REWIND_IDLE_MS = 3000;

export function SiteViewer({
  site,
  onRewind,
  canRewind = false,
}: {
  site: DiscoverySite;
  /** Step back to the previous site. Omitted where there is no trail. */
  onRewind?: (() => void) | undefined;
  canRewind?: boolean | undefined;
}) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // Starts closed and opens on the client, because both answers live in
  // browser storage and there is none of that during SSR.
  const [allowed, setAllowed] = useState(false);

  // A platform that publishes its own embeddable address gets framed at that
  // address instead. Nothing else about the site changes -- the catalogue's
  // own `embeddable` flag was read off the canonical page, which is not the
  // page being framed here, so it does not apply to this branch.
  const embed = useMemo(() => embedFor(site.url), [site.url]);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    const decide = () =>
      setAllowed(!site.adult || alwaysShowAdult() || hasAcknowledgedAdult(site.id));
    decide();
    // Turning the setting on with a warning already on screen should clear it
    // there and then rather than on the next site.
    window.addEventListener(ADULT_PREF_EVENT, decide);
    return () => window.removeEventListener(ADULT_PREF_EVENT, decide);
  }, [site.id, site.adult]);

  // The embed timeout must not run while the warning is up: nothing has been
  // asked for yet, so there is nothing that could have timed out.
  const framable = embed !== null || site.embeddable;
  useEffect(() => {
    if (!allowed || !framable || loaded) return;
    const t = setTimeout(() => setTimedOut(true), EMBED_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [site.id, framable, loaded, allowed]);

  const showPreview = !framable || timedOut;

  // Re-armed on every new site, so arriving somewhere never starts with chrome
  // already sitting on it.
  const idle = useIdleReveal(REWIND_IDLE_MS, site.id, canRewind && Boolean(onRewind));

  const reveal = () => {
    acknowledgeAdult(site.id);
    setAllowed(true);
  };

  return (
    <div className="app-viewer-outer">
      <div className="app-viewer-frame">
        {!allowed ? (
          // Returned instead of the frame, never over it. Nothing of the site
          // is fetched, rendered or played while this is on screen -- which is
          // as true of an embed as of the page itself.
          <ContentWarning domain={site.domain} onShow={reveal} />
        ) : !showPreview ? (
          <>
            {!loaded && <div className="app-screen-glow" aria-hidden="true" />}
            <iframe
              key={`${site.id}-${embed ? "embed" : "page"}`}
              className="app-viewer-iframe"
              src={embed ? embed.src : site.url}
              title={embed ? `${embed.kind} — ${site.domain}` : site.title}
              onLoad={() => setLoaded(true)}
              referrerPolicy="no-referrer"
              {...(embed?.allow ? { allow: embed.allow } : {})}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </>
        ) : (
          <PreviewCard site={site} unreachable={timedOut} />
        )}
      </div>
      {/* Outside the frame element, inside the same box: it overlays the site
          without being inside the part that gets replaced when one loads. */}
      {onRewind && canRewind ? <RewindButton visible={idle} onRewind={onRewind} /> : null}
    </div>
  );
}

// The fallback presentation, not a downgrade: source domain, title, blurb,
// and one obvious way to open the site in its own tab.
function PreviewCard({ site, unreachable }: { site: DiscoverySite; unreachable?: boolean }) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        background: "var(--app-bg, #FAFAF7)",
        overflowY: "auto",
      }}
    >
      <article
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 20,
          border: "1px solid var(--app-border, #E6E6E1)",
          background: "var(--app-chrome-bg, #ffffff)",
          padding: 22,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.02em",
            color: "var(--app-fg-muted, #6B6B66)",
          }}
        >
          {site.domain}
        </p>
        <h2
          style={{
            margin: "6px 0 0",
            fontSize: 22,
            lineHeight: 1.2,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--app-fg, #111111)",
          }}
        >
          {site.title}
        </h2>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--app-fg-muted, #6B6B66)",
          }}
        >
          {site.blurb}
        </p>
        <a
          href={site.url}
          target="_blank"
          rel="noreferrer noopener"
          style={{
            marginTop: 18,
            display: "flex",
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: "1px solid var(--app-border, #E6E6E1)",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
            color: "var(--app-fg, #111111)",
          }}
        >
          Open site
        </a>
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 12,
            textAlign: "center",
            color: "var(--app-fg-muted, #6B6B66)",
          }}
        >
          {unreachable
            ? "This site is slow to answer right now, so it opens in its own tab."
            : "This site asks not to be embedded, so it opens in its own tab."}
        </p>
      </article>
    </div>
  );
}
