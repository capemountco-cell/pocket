import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { useNavStyle } from "@/lib/nav-style";
import { APP_CONTENT_MAX_WIDTH, navContentReserve } from "@/components/nav/navMetrics";
import { BottomNav } from "@/components/nav/BottomNav";
import { blendBoard, fetchExplorePage, type ExploreSite, type ExplorePage } from "@/lib/explore";
import { BoardPaidTag, BoardRow, BoardStat } from "@/components/BoardRow";
import { screenshotFor, type Screenshot } from "@/lib/screenshots";
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

  const board = page ? blendBoard(page) : [];

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
          {failed ? (
            <Note text="Couldn't reach the catalogue." />
          ) : !page ? (
            <Note text="Gathering the best of it…" />
          ) : board.length === 0 ? (
            <Note text="Nothing to feature yet." />
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {board.map((entry, i) =>
                entry.kind === "earned" && entry.rank <= 3 ? (
                  <li key={entry.site.id} style={{ marginBottom: 28, marginTop: i === 0 ? 0 : 8 }}>
                    <Card
                      site={entry.site}
                      rank={entry.rank}
                      lead={entry.rank === 1}
                      onOpen={open}
                    />
                  </li>
                ) : (
                  <li key={entry.site.id}>
                    <BoardRow
                      domain={entry.site.domain}
                      title={entry.site.domain}
                      description={
                        entry.site.description ? clamp(entry.site.description, 90) : null
                      }
                      lead={entry.kind === "paid" ? <BoardPaidTag /> : entry.rank}
                      trailing={
                        entry.kind === "earned" && entry.site.likes > 0 ? (
                          <BoardStat value={entry.site.likes} unit="likes" />
                        ) : undefined
                      }
                      onOpen={() => open(entry.site)}
                    />
                  </li>
                ),
              )}
            </ol>
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

/**
 * The picture at the top of a card.
 *
 * It asks for its capture the moment it mounts rather than waiting to be
 * scrolled to. Explore only ever puts a picture on its top three, so there is
 * no fan-out to protect against here -- and the observer that used to guard
 * against one was costing the third card a wait it never needed to have. The
 * first card's image is the largest thing on the screen, so it says so.
 *
 * Until a picture lands the frame holds its own shape and shows the domain
 * over a slow sheen, so the wait reads as a picture arriving rather than as
 * an empty box. The sheen stops the moment the request settles, whether or
 * not it produced anything.
 *
 * The source falls back rather than fails: the resized capture, then the
 * full-size original if the transformer would not serve it, then og_image,
 * then nothing at all.
 */
function Shot({ site, rank }: { site: ExploreSite; rank: number }) {
  const [shot, setShot] = useState<Screenshot | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let live = true;
    setShot(null);
    setSrc(null);
    setSettled(false);
    screenshotFor(site.url)
      .then((next) => {
        if (!live) return;
        setShot(next);
        // og_image is the understudy: worse framing, but a real picture of
        // the site beats an empty frame.
        setSrc(next ? next.src : site.image);
        setSettled(true);
      })
      .catch(() => live && setSettled(true));
    return () => {
      live = false;
    };
  }, [site.url, site.image]);

  // One step down the chain per failure, never a loop: resized capture, then
  // the stored original, then og_image, then an honest empty frame.
  const stepDown = () => {
    setSrc((current) => {
      if (!current) return null;
      if (shot && current === shot.src) return shot.full;
      if (site.image && current !== site.image) return site.image;
      return null;
    });
  };

  const lead = rank === 1;

  return (
    <span
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

      <span
        aria-hidden="true"
        className="app-sheen"
        data-loaded={settled ? "true" : "false"}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(100deg, rgba(255,255,255,0) 18%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0) 82%)",
          backgroundSize: "200% 100%",
          pointerEvents: "none",
        }}
      />

      {src ? (
        <img
          src={src}
          alt=""
          // The first card's picture is the biggest thing on the screen and
          // the reason the page exists; the other two can wait their turn.
          loading={lead ? "eager" : "lazy"}
          fetchPriority={lead ? "high" : "auto"}
          decoding="async"
          onError={stepDown}
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
