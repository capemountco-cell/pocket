import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { useNavStyle } from "@/lib/nav-style";
import { navContentReserve } from "@/components/nav/navMetrics";
import { APP_CONTENT_MAX_WIDTH } from "@/components/nav/navMetrics";
import { BottomNav } from "@/components/nav/BottomNav";
import { fetchExplore, type ExploreSite } from "@/lib/explore";
import { OPEN_SITE_KEY } from "@/routes/saved";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: `Explore — ${APP_NAME}` },
      {
        name: "description",
        content: "The corners of the web people keep coming back to.",
      },
    ],
  }),
  component: ExploreScreen,
});

/**
 * The featured page: black, full screen, read like a magazine rather than
 * scanned like a table.
 *
 * The catalogue decides the layout. Only about a third of live sites carry an
 * image, so the page cannot be a grid of pictures with holes in it -- it is
 * built on type, and an image is treated as a bonus that promotes a card
 * rather than a requirement that excludes one. Roughly four in five have a
 * description, which is the material the cards actually lean on.
 */
function ExploreScreen() {
  const navStyle = useNavStyle();
  const navigate = useNavigate();
  const [sites, setSites] = useState<ExploreSite[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchExplore()
      .then((rows) => live && setSites(rows))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  // Opening from here hands the id to the discovery screen rather than
  // launching a tab: Explore is a way into the app, not out of it.
  const open = (site: ExploreSite) => {
    try {
      sessionStorage.setItem(OPEN_SITE_KEY, site.id);
    } catch {
      // A private window with storage denied still gets a random site.
    }
    // No event recorded here on purpose. record_event drops any kind missing
    // from its server-side allowlist without erroring, and this deployment
    // cannot reach that database to add one -- so an "explore_open" would look
    // wired and write nothing. Borrowing an allowed name instead would quietly
    // corrupt what that name means. Add both together when DB access is back.
    void navigate({ to: "/" });
  };

  const lead = sites?.[0];
  const rest = sites?.slice(1) ?? [];

  return (
    <>
      <main
        style={{
          position: "fixed",
          inset: 0,
          paddingBottom: navContentReserve(navStyle),
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          background: "#000000",
          color: "#ffffff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <header style={{ ...COLUMN, flex: "0 0 auto", padding: "14px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link to="/" aria-label="Back to discovery" style={BACK}>
              <ArrowLeft size={22} aria-hidden="true" />
            </Link>
          </div>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: 40,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Explore
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: MUTED }}>
            The corners people keep coming back to.
          </p>
        </header>

        <div
          style={{
            ...COLUMN,
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "22px 20px 32px",
          }}
        >
          {failed ? (
            <Note text="Couldn't reach the catalogue." />
          ) : !sites ? (
            <Note text="Gathering the best of it…" />
          ) : sites.length === 0 ? (
            <Note text="Nothing to feature yet." />
          ) : (
            <>
              {lead ? <LeadCard site={lead} onOpen={open} /> : null}
              <ol style={{ listStyle: "none", margin: "26px 0 0", padding: 0 }}>
                {rest.map((site, i) => (
                  <li key={site.id}>
                    <Card site={site} rank={i + 2} onOpen={open} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </main>

      <BottomNav onDiscover={() => void navigate({ to: "/" })} />
    </>
  );
}

/** The one at the top gets the space a cover story gets. */
function LeadCard({ site, onOpen }: { site: ExploreSite; onOpen: (s: ExploreSite) => void }) {
  return (
    <button type="button" onClick={() => onOpen(site)} style={{ ...RESET, width: "100%" }}>
      {site.image ? (
        <img
          src={site.image}
          alt=""
          loading="lazy"
          onError={hideBrokenImage}
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "16 / 10",
            objectFit: "cover",
            borderRadius: 16,
            background: "#101012",
            marginBottom: 16,
          }}
        />
      ) : null}
      <Eyebrow site={site} />
      <h2
        style={{
          margin: "8px 0 0",
          fontSize: 30,
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        {site.title}
      </h2>
      {site.description ? (
        <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.5, color: MUTED }}>
          {clamp(site.description, 180)}
        </p>
      ) : null}
    </button>
  );
}

/** Everything below the lead: rank, title, a line of description. */
function Card({
  site,
  rank,
  onOpen,
}: {
  site: ExploreSite;
  rank: number;
  onOpen: (s: ExploreSite) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(site)}
      style={{
        ...RESET,
        width: "100%",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        padding: "18px 0",
        borderTop: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 26,
          fontSize: 15,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: "rgba(255,255,255,0.35)",
          paddingTop: 3,
        }}
      >
        {rank}
      </span>
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
        <Eyebrow site={site} />
        <span
          style={{
            display: "block",
            margin: "6px 0 0",
            fontSize: 19,
            lineHeight: 1.25,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          {site.title}
        </span>
        {site.description ? (
          <span
            style={{
              display: "block",
              margin: "6px 0 0",
              fontSize: 14.5,
              lineHeight: 1.45,
              color: MUTED,
            }}
          >
            {clamp(site.description, 120)}
          </span>
        ) : null}
      </span>
      {site.image ? (
        <img
          src={site.image}
          alt=""
          loading="lazy"
          onError={hideBrokenImage}
          style={{
            flex: "0 0 auto",
            width: 72,
            height: 72,
            objectFit: "cover",
            borderRadius: 12,
            background: "#101012",
          }}
        />
      ) : null}
    </button>
  );
}

/** Domain, then whatever else the row actually has to say. */
function Eyebrow({ site }: { site: ExploreSite }) {
  const bits = [site.domain];
  if (site.likes > 0) bits.push(`${site.likes} ${site.likes === 1 ? "like" : "likes"}`);
  if (site.tags[0]) bits.push(site.tags[0]);
  return (
    <span
      style={{
        display: "block",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.45)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {bits.join(" · ")}
    </span>
  );
}

function Note({ text }: { text: string }) {
  return (
    <p role="status" aria-live="polite" style={{ margin: "40px 0", fontSize: 15, color: MUTED }}>
      {text}
    </p>
  );
}

// A description is a sentence someone else wrote, so it is cut on a word and
// only when it is genuinely too long to sit in a card.
function clamp(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// og_image is a URL someone else controls, and a good number of them 404 by
// now. The broken-image glyph a browser substitutes is uglier than the card
// with no picture at all, so the element takes itself out.
function hideBrokenImage(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = "none";
}

const MUTED = "rgba(255,255,255,0.62)";

const COLUMN: React.CSSProperties = {
  width: "100%",
  maxWidth: APP_CONTENT_MAX_WIDTH,
  marginInline: "auto",
  boxSizing: "border-box",
};

const RESET: React.CSSProperties = {
  appearance: "none",
  background: "transparent",
  border: 0,
  padding: 0,
  margin: 0,
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

const BACK: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  marginLeft: -10,
  borderRadius: 999,
  color: "#ffffff",
};
