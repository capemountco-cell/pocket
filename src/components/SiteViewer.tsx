import { useEffect, useState } from "react";
import { ContentWarning } from "@/components/ContentWarning";
import { acknowledgeAdult, hasAcknowledgedAdult } from "@/lib/adult-consent";
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

export function SiteViewer({ site }: { site: DiscoverySite }) {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // Starts closed and opens on the client, because the answer lives in
  // sessionStorage and there is none of that during SSR.
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    setAllowed(!site.adult || hasAcknowledgedAdult(site.id));
  }, [site.id, site.adult]);

  // The embed timeout must not run while the warning is up: nothing has been
  // asked for yet, so there is nothing that could have timed out.
  useEffect(() => {
    if (!allowed || !site.embeddable || loaded) return;
    const t = setTimeout(() => setTimedOut(true), EMBED_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [site.id, site.embeddable, loaded, allowed]);

  const showPreview = !site.embeddable || timedOut;

  const reveal = () => {
    acknowledgeAdult(site.id);
    setAllowed(true);
  };

  return (
    <div className="app-viewer-outer">
      <div className="app-viewer-frame">
        {!allowed ? (
          // Returned instead of the frame, never over it. Nothing of the site
          // is fetched, rendered or played while this is on screen.
          <ContentWarning domain={site.domain} onShow={reveal} />
        ) : !showPreview ? (
          <>
            {!loaded && <div className="app-screen-glow" aria-hidden="true" />}
            <iframe
              key={site.id}
              className="app-viewer-iframe"
              src={site.url}
              title={site.title}
              onLoad={() => setLoaded(true)}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </>
        ) : (
          <PreviewCard site={site} unreachable={timedOut} />
        )}
      </div>
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
