import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { useNavStyle } from "@/lib/nav-style";
import { APP_CONTENT_MAX_WIDTH, navContentReserve } from "@/components/nav/navMetrics";
import { BottomNav } from "@/components/nav/BottomNav";
import { fetchExplorePage, type ExploreSite, type ExplorePage } from "@/lib/explore";
import { SiteIcon } from "@/components/SiteIcon";
import { screenshotFor } from "@/lib/screenshots";
import { OPEN_SITE_KEY } from "@/routes/saved";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: `Explore — ${APP_NAME}` },
      { name: "description", content: "The corners of the web people keep coming back to." },
    ],
  }),
  component: ExploreScreen,
});

/**
 * The featured page: black, full screen, and built as a leaderboard.
 *
 * Two boards, never mixed. Paid placement sits on top under a heading that
 * says it was paid for; the earned ranking sits below it. Sorting bought
 * placement into an editorial "top" would make the number beside every other
 * row mean nothing, so the page keeps them visibly apart.
 *
 * The top three of the earned board get a real screenshot, captured at
 * 1440x900 on a 2x device scale -- a front page, so the thing a person judges
 * is what the site actually looks like. Everything below is a compact row
 * with an icon, which is what lets a leaderboard read as a leaderboard rather
 * than as sixty posters in a stack.
 *
 * Screenshots are not free -- a cache miss drives a headless browser session
 * -- so a card asks for its own only as it comes into view, and falls back
 * quietly through og_image to no image at all rather than showing a broken
 * frame or an error.
 */
function ExploreScreen() {
  const navStyle = useNavStyle();
  const navigate = useNavigate();
  const [page, setPage] = useState<ExplorePage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchExplorePage()
      .then((next) => live && setPage(next))
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
        {/* Only the way out is pinned. The masthead scrolls with the boards:
            on a 844px phone it was holding 250px of chrome above a list whose
            whole point is seeing enough rows at once to compare them. */}
        <header style={{ ...COLUMN, flex: "0 0 auto", padding: "14px 20px 0" }}>
          <Link to="/" aria-label="Back to discovery" style={BACK}>
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
        </header>

        <div
          style={{
            ...COLUMN,
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "6px 20px 32px",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 40,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Explore
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: 15, color: MUTED }}>
            The corners people keep coming back to.
          </p>

          {failed ? (
            <Note text="Couldn't reach the catalogue." />
          ) : !page ? (
            <Note text="Gathering the best of it…" />
          ) : page.top.length === 0 && page.boosted.length === 0 ? (
            <Note text="Nothing to feature yet." />
          ) : (
            <>
              {page.boosted.length > 0 ? (
                <section style={{ marginBottom: 34 }}>
                  {/* Said plainly. Someone paid to be here, and a reader is
                      entitled to know that before they judge the placement. */}
                  <Heading label="Boosted" note="Paid placement" />
                  <ol style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>
                    {page.boosted.map((site) => (
                      <li key={site.id}>
                        <Row site={site} onOpen={open} />
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              <section>
                <Heading label="Top sites" note="Ranked by how they land" />
                <ol style={{ listStyle: "none", margin: "16px 0 0", padding: 0 }}>
                  {page.top.map((site, i) =>
                    i < 3 ? (
                      <li key={site.id} style={{ marginBottom: 28 }}>
                        <Card site={site} rank={i + 1} lead={i === 0} onOpen={open} />
                      </li>
                    ) : (
                      <li key={site.id}>
                        <Row site={site} rank={i + 1} onOpen={open} />
                      </li>
                    ),
                  )}
                </ol>
              </section>
            </>
          )}
        </div>
      </main>

      <BottomNav onDiscover={() => void navigate({ to: "/" })} />
    </>
  );
}

/**
 * One site: its picture, then who it is and what it does.
 *
 * The lead runs wider type than the rest; the layout is otherwise identical,
 * because a magazine's cover story is the same object as its contents, only
 * bigger.
 */
function Card({
  site,
  rank,
  lead,
  onOpen,
}: {
  site: ExploreSite;
  rank: number;
  lead: boolean;
  onOpen: (s: ExploreSite) => void;
}) {
  return (
    <button type="button" onClick={() => onOpen(site)} style={{ ...RESET, width: "100%" }}>
      <Shot site={site} rank={rank} />
      <span style={{ display: "block", marginTop: 14 }}>
        <Eyebrow site={site} />
        <span
          style={{
            display: "block",
            margin: "7px 0 0",
            fontSize: lead ? 30 : 22,
            lineHeight: 1.15,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          {site.title}
        </span>
        {site.description ? (
          <span
            style={{
              display: "block",
              margin: "8px 0 0",
              fontSize: lead ? 16 : 15,
              lineHeight: 1.5,
              color: MUTED,
            }}
          >
            {clamp(site.description, lead ? 190 : 140)}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/** A board's name, and what put things on it. */
function Heading({ label, note }: { label: string; note: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </h2>
      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.42)" }}>{note}</span>
    </div>
  );
}

/**
 * A compact entry: rank, icon, who it is, and how it has done.
 *
 * This is the leaderboard's real unit. The screenshot cards above are the
 * front page; below them density is the point, because a board only reads as
 * a board when enough of it is on screen at once to compare.
 *
 * Boosted rows pass no rank -- they are not placed, they are bought, and
 * numbering them would imply they beat something.
 */
function Row({
  site,
  rank,
  onOpen,
}: {
  site: ExploreSite;
  rank?: number | undefined;
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
        gap: 13,
        alignItems: "center",
        padding: "13px 0",
        borderTop: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      {rank ? (
        <span
          aria-hidden="true"
          style={{
            flex: "0 0 auto",
            width: 24,
            fontSize: 13.5,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: "rgba(255,255,255,0.34)",
          }}
        >
          {rank}
        </span>
      ) : null}
      <SiteIcon domain={site.domain} />
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 15.5,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {site.domain}
        </span>
        {site.description ? (
          <span
            style={{
              display: "block",
              marginTop: 2,
              fontSize: 13.5,
              lineHeight: 1.35,
              color: MUTED,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {clamp(site.description, 90)}
          </span>
        ) : null}
      </span>
      {site.likes > 0 ? (
        // The unit is not decoration. On the board outbid.lol builds, the
        // right-hand number is money and the dollar sign says so; a bare
        // integer here reads just as easily as a rank or a price.
        <span
          style={{
            flex: "0 0 auto",
            fontSize: 13.5,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: "rgba(255,255,255,0.55)",
            whiteSpace: "nowrap",
          }}
        >
          {site.likes}
          <span style={{ marginLeft: 4, fontWeight: 600, color: "rgba(255,255,255,0.34)" }}>
            {site.likes === 1 ? "like" : "likes"}
          </span>
        </span>
      ) : null}
    </button>
  );
}

/**
 * The picture at the top of a card.
 *
 * It asks for a capture only once it is near the viewport, so a page of sixty
 * costs sixty browser sessions only if someone actually scrolls past all
 * sixty. Until an image resolves the frame holds its own shape, so nothing
 * below it jumps when one arrives.
 */
function Shot({ site, rank }: { site: ExploreSite; rank: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let live = true;
    const start = () => {
      screenshotFor(site.url)
        .then((shot) => {
          if (!live) return;
          // og_image is the understudy: worse framing, but a real picture of
          // the site beats an empty frame.
          setSrc(shot ?? site.image);
          setSettled(true);
        })
        .catch(() => live && setSettled(true));
    };

    // rootMargin gives the capture a head start on the scroll, so by the time
    // a card is actually on screen its picture is usually already there.
    if (typeof IntersectionObserver === "undefined") {
      start();
      return () => {
        live = false;
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [site.url, site.image]);

  return (
    <span
      ref={ref}
      style={{
        display: "block",
        position: "relative",
        width: "100%",
        // The captures are 1440x900, so the frame matches rather than cropping.
        aspectRatio: "16 / 10",
        borderRadius: 18,
        overflow: "hidden",
        background: "linear-gradient(145deg, #141418 0%, #0b0b0e 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* The domain sits underneath at all times rather than only when there
          is no picture. A capture can take a few seconds to arrive and a few
          more to paint, and an empty black rectangle for that long reads as
          broken -- this way the frame always says something, and the image
          simply covers it when it lands. */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          textAlign: "center",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: settled ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.16)",
        }}
      >
        {site.domain}
      </span>

      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setSrc(null)}
          onLoad={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            // Fades up on load, so a picture arriving does not snap into the
            // frame the moment the last byte lands.
            opacity: 0,
            transition: "opacity 260ms ease-out",
          }}
        />
      ) : null}

      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 28,
          height: 28,
          padding: "0 9px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.62)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.14)",
          fontSize: 13,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {rank}
      </span>
    </span>
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
