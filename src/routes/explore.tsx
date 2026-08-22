import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { useNavStyle } from "@/lib/nav-style";
import { APP_CONTENT_MAX_WIDTH, navContentReserve } from "@/components/nav/navMetrics";
import { BottomNav } from "@/components/nav/BottomNav";
import {
  fetchBoardPage,
  fetchExploreBoard,
  pageCount,
  PAGE_SIZE,
  type BoardEntry,
  type ExploreBoard,
} from "@/lib/explore";
import { BoardRow, BoardStat } from "@/components/BoardRow";
import { BidCta, BID_ACCENT } from "@/components/BidCta";
import { money } from "@/lib/bids";
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
 * One board a thousand deep, in ten pages of a hundred. Bids hold the top of
 * it and everything earned falls in underneath -- so a bought position really
 * does displace the sites above it rather than sitting in a roped-off block
 * beside them. Every bought row carries its price, which says both that the
 * placement was paid for and what it took, and that second number is the one
 * anyone wanting the spot has to beat.
 *
 * Depth is reached two ways, because they answer different questions. Reading
 * on appends the next hundred as the end comes into view; the pager jumps
 * straight to a page for someone who wants to know what #700 looks like. A
 * jump replaces the run rather than filling in everything before it -- nine
 * pages nobody asked for is not a shortcut.
 *
 * The top three positions get a real screenshot, captured at 1440x900 on a 2x
 * device scale -- a front page, so the thing a person judges is what the site
 * actually looks like. That treatment follows the position, not how it was
 * won: a bid at #1 is the front page. Everything below is a compact row with
 * an icon, which is what lets a leaderboard read as a leaderboard rather than
 * as a thousand posters in a stack.
 *
 * Screenshots are not free -- a cache miss drives a headless browser session
 * -- so they are confined to those three, and each falls back quietly through
 * og_image to no image at all rather than showing a broken frame.
 */
function ExploreScreen() {
  const navStyle = useNavStyle();
  const navigate = useNavigate();
  const [state, setState] = useState<ExploreBoard | null>(null);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const tail = useRef<HTMLDivElement>(null);
  // A ref as well as state: the observer fires while a fetch is in flight and
  // has to see the answer immediately, not on the next render.
  const loading = useRef(false);

  const reload = () => setNonce((n) => n + 1);

  useEffect(() => {
    let live = true;
    setState(null);
    setFailed(false);
    setCurrent(0);
    fetchExploreBoard()
      .then((next) => live && setState(next))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [nonce]);

  const total = state ? pageCount(state.depth) : 1;
  const last = state?.slices.at(-1)?.page ?? 0;
  const more = state !== null && last + 1 < total;

  /** Appends the next hundred. Guarded so a fast scroll cannot double-fetch. */
  const loadMore = useCallback(() => {
    if (!state || loading.current) return;
    const next = (state.slices.at(-1)?.page ?? 0) + 1;
    if (next >= pageCount(state.depth)) return;
    loading.current = true;
    setBusy(true);
    fetchBoardPage(next, state.board, state.depth)
      .then((slice) => {
        setState((prev) =>
          // Discarded if the run moved underneath it -- a jump landing while
          // this was in flight must not staple a stale page onto the new run.
          prev && (prev.slices.at(-1)?.page ?? -1) === next - 1
            ? { ...prev, slices: [...prev.slices, slice] }
            : prev,
        );
      })
      .catch(() => {
        // A page that will not load is not a broken board. The run stops where
        // it is and the reader can try again by scrolling back into the tail.
      })
      .finally(() => {
        loading.current = false;
        setBusy(false);
      });
  }, [state]);

  // Reading on loads the next page before the reader arrives at the end of
  // this one, so the list grows under the scroll rather than after it.
  useEffect(() => {
    const mark = tail.current;
    const root = scroller.current;
    if (!mark || !root || !more) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root, rootMargin: "800px 0px" },
    );
    io.observe(mark);
    return () => io.disconnect();
  }, [more, loadMore]);

  // Which page the reader is actually looking at, so the pager marks it.
  // Measured from the blocks themselves rather than from a scroll offset,
  // because the blocks are not a uniform height -- the first carries three
  // cards and a bid form.
  useEffect(() => {
    const root = scroller.current;
    if (!root || !state) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const blocks = root.querySelectorAll<HTMLElement>("[data-page]");
      const top = root.getBoundingClientRect().top;
      let seen: number | null = null;
      blocks.forEach((block) => {
        if (block.getBoundingClientRect().top - top <= 8) {
          seen = Number(block.dataset["page"] ?? 0);
        }
      });
      setCurrent(seen ?? state.slices[0]?.page ?? 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [state]);

  const goTo = (page: number) => {
    if (!state || page === current) return;
    const held = state.slices.some((s) => s.page === page);
    if (held) {
      scroller.current?.querySelector<HTMLElement>(`[data-page="${page}"]`)?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
      return;
    }
    loading.current = true;
    setBusy(true);
    fetchBoardPage(page, state.board, state.depth)
      .then((slice) => {
        setState((prev) => (prev ? { ...prev, slices: [slice] } : prev));
        setCurrent(page);
        scroller.current?.scrollTo({ top: 0 });
      })
      .catch(() => setFailed(true))
      .finally(() => {
        loading.current = false;
        setBusy(false);
      });
  };

  // Opening from here hands the id to the discovery screen rather than
  // launching a tab: Explore is a way into the app, not out of it.
  const open = (id: string) => {
    try {
      sessionStorage.setItem(OPEN_SITE_KEY, id);
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

  const empty = state !== null && state.slices.every((s) => s.entries.length === 0);

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
          ref={scroller}
          style={{
            ...COLUMN,
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "6px 20px 32px",
          }}
        >
          {state ? <BidCta board={state.board} onPlaced={reload} /> : null}

          {failed ? (
            <Note text="Couldn't reach the catalogue." />
          ) : !state ? (
            <Note text="Gathering the best of it…" />
          ) : empty ? (
            <Note text="Nothing to feature yet." />
          ) : (
            <>
              {/* Above the board rather than below it. A pager under an
                  infinite list keeps walking away from the reader as the list
                  grows; here it stays put, says where you are, and jumps. */}
              <Pager total={total} current={current} depth={state.depth} onGo={goTo} />

              {state.slices.map((slice) => (
                <div key={slice.page} data-page={slice.page}>
                  {slice.page > 0 ? <Marker page={slice.page} depth={state.depth} /> : null}
                  <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {slice.entries.map((entry, i) => (
                      <Position
                        key={keyOf(entry)}
                        entry={entry}
                        first={slice.page === 0 && i === 0}
                        onOpen={open}
                      />
                    ))}
                  </ol>
                </div>
              ))}

              <div ref={tail} style={{ height: 1 }} aria-hidden="true" />

              {busy ? (
                <Note text="Loading more…" />
              ) : more ? null : (
                <p style={{ margin: "26px 0 0", fontSize: 13, color: FAINT, textAlign: "center" }}>
                  That's the whole board.
                </p>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav onDiscover={() => void navigate({ to: "/" })} />
    </>
  );
}

/**
 * One position, rendered by where it sits rather than by how it was won.
 *
 * A bid and an earned entry are the same object to a reader -- a site, at a
 * number -- so they share a row and a card. The only thing that differs is
 * what the right-hand side has to say: a price for a bought place, a like
 * count for an earned one.
 */
function Position({
  entry,
  first,
  onOpen,
}: {
  entry: BoardEntry;
  first: boolean;
  onOpen: (id: string) => void;
}) {
  const face = faceOf(entry);
  const paid = entry.kind === "bid";

  if (entry.rank <= 3) {
    return (
      <li style={{ marginBottom: 28, marginTop: first ? 0 : 8 }}>
        <Card
          face={face}
          rank={entry.rank}
          lead={entry.rank === 1}
          meta={
            <>
              {face.domain}
              {paid ? (
                <>
                  {" · "}
                  <span style={{ color: BID_ACCENT }}>{money(entry.bid.amountCents)}</span>
                </>
              ) : (
                earnedMeta(entry.site.likes, entry.site.tags[0])
              )}
            </>
          }
          onOpen={onOpen}
        />
      </li>
    );
  }

  return (
    <li>
      <BoardRow
        domain={face.domain}
        icon={face.icon}
        title={face.domain}
        description={face.description ? clamp(face.description, 90) : null}
        lead={entry.rank}
        trailing={
          paid ? (
            <BidAmount cents={entry.bid.amountCents} />
          ) : entry.site.likes > 0 ? (
            <BoardStat value={entry.site.likes} unit="likes" />
          ) : undefined
        }
        onOpen={() => onOpen(face.id)}
      />
    </li>
  );
}

/** What a card and a row both need, whichever kind of entry they came from. */
type Face = {
  id: string;
  url: string;
  domain: string;
  title: string;
  description: string | null;
  image: string | null;
  /** Resolved icon address, or null when the catalogue found none. */
  icon: string | null;
};

function faceOf(entry: BoardEntry): Face {
  if (entry.kind === "earned") {
    const s = entry.site;
    return {
      id: s.id,
      url: s.url,
      domain: s.domain,
      title: s.title,
      description: s.description,
      image: s.image,
      icon: s.icon,
    };
  }
  const b = entry.bid;
  const title = b.title?.trim();
  return {
    id: b.id,
    url: b.url,
    domain: b.domain,
    // Part of the catalogue was imported with the address as the title, and a
    // raw URL wrapped across three lines is not a name. Matches pickTitle().
    title: title && !/^https?:\/\//i.test(title) ? title : b.domain,
    description: b.description,
    image: b.image,
    icon: b.icon,
  };
}

function keyOf(entry: BoardEntry): string {
  return entry.kind === "bid" ? `bid-${entry.bid.id}` : entry.site.id;
}

function earnedMeta(likes: number, tag: string | undefined): ReactNode {
  const bits: string[] = [];
  if (likes > 0) bits.push(`${likes} ${likes === 1 ? "like" : "likes"}`);
  if (tag) bits.push(tag);
  return bits.length > 0 ? ` · ${bits.join(" · ")}` : null;
}

/**
 * Ten pages, always reachable.
 *
 * The numbers scroll sideways rather than shrinking to fit, so a 390px phone
 * gets the same tap target as anything wider. The row below says what the
 * numbers mean, because "4" on its own does not tell you it holds #301-400.
 */
function Pager({
  total,
  current,
  depth,
  onGo,
}: {
  total: number;
  current: number;
  depth: number;
  onGo: (page: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <nav
      aria-label="Board pages"
      style={{ margin: "4px 0 18px", borderTop: HAIRLINE, paddingTop: 14 }}
    >
      <div
        style={{
          display: "flex",
          // Ten numbers, 4px apart, sized to clear 44px of column padding on a
          // 390px phone -- so the last page is a tap rather than a swipe. The
          // row still scrolls if a narrower screen turns up.
          gap: 4,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 2,
        }}
      >
        {Array.from({ length: total }, (_, page) => {
          const on = page === current;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onGo(page)}
              aria-current={on ? "true" : undefined}
              aria-label={`Page ${page + 1}, positions ${page * PAGE_SIZE + 1} to ${Math.min(
                (page + 1) * PAGE_SIZE,
                depth,
              )}`}
              style={{
                appearance: "none",
                flex: "0 0 auto",
                minWidth: 30,
                height: 32,
                padding: "0 6px",
                borderRadius: 9,
                border: on ? "1px solid rgba(255,255,255,0.22)" : "1px solid transparent",
                background: on ? "rgba(255,255,255,0.10)" : "transparent",
                color: on ? "#ffffff" : "rgba(255,255,255,0.46)",
                font: "inherit",
                fontSize: 14,
                fontWeight: on ? 750 : 600,
                fontVariantNumeric: "tabular-nums",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {page + 1}
            </button>
          );
        })}
      </div>
      <p
        style={{
          margin: "9px 0 0",
          fontSize: 12,
          color: FAINT,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {`Showing #${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, depth)} of ${depth.toLocaleString()}`}
      </p>
    </nav>
  );
}

/** Where one hundred ends and the next begins, during a continuous scroll. */
function Marker({ page, depth }: { page: number; depth: number }) {
  return (
    <p
      style={{
        margin: "22px 0 6px",
        paddingTop: 14,
        borderTop: HAIRLINE,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: FAINT,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {`#${page * PAGE_SIZE + 1} – ${Math.min((page + 1) * PAGE_SIZE, depth)}`}
    </p>
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
  face,
  rank,
  lead,
  meta,
  onOpen,
}: {
  face: Face;
  rank: number;
  lead: boolean;
  meta: ReactNode;
  onOpen: (id: string) => void;
}) {
  return (
    <button type="button" onClick={() => onOpen(face.id)} style={{ ...RESET, width: "100%" }}>
      <Shot face={face} rank={rank} />
      <span style={{ display: "block", marginTop: 14 }}>
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
          {meta}
        </span>
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
          {face.title}
        </span>
        {face.description ? (
          <span
            style={{
              display: "block",
              margin: "8px 0 0",
              fontSize: lead ? 16 : 15,
              lineHeight: 1.5,
              color: MUTED,
            }}
          >
            {clamp(face.description, lead ? 190 : 140)}
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
function Shot({ face, rank }: { face: Face; rank: number }) {
  const [shot, setShot] = useState<Screenshot | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let live = true;
    setShot(null);
    setSrc(null);
    setSettled(false);
    screenshotFor(face.url)
      .then((next) => {
        if (!live) return;
        setShot(next);
        // og_image is the understudy: worse framing, but a real picture of
        // the site beats an empty frame.
        setSrc(next ? next.src : face.image);
        setSettled(true);
      })
      .catch(() => live && setSettled(true));
    return () => {
      live = false;
    };
  }, [face.url, face.image]);

  // One step down the chain per failure, never a loop: resized capture, then
  // the stored original, then og_image, then an honest empty frame.
  const stepDown = () => {
    setSrc((current) => {
      if (!current) return null;
      if (shot && current === shot.src) return shot.full;
      if (face.image && current !== face.image) return face.image;
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
        {face.domain}
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

/**
 * What a place on the board cost.
 *
 * This replaces the old "Ad" chip. A row carrying a visible price is a
 * stronger disclosure than a label, not a weaker one -- it says the placement
 * was bought AND what it took, which is also the number anyone wanting that
 * spot has to beat.
 */
function BidAmount({ cents }: { cents: number }) {
  return (
    <span
      style={{
        fontSize: 14.5,
        fontWeight: 750,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.01em",
        color: BID_ACCENT,
        whiteSpace: "nowrap",
      }}
    >
      {money(cents)}
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
const FAINT = "rgba(255,255,255,0.40)";
const HAIRLINE = "1px solid rgba(255,255,255,0.10)";

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
