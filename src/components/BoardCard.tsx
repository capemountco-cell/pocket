import { useEffect, useRef, useState, type ReactNode } from "react";
import { screenshotFor, type Screenshot } from "@/lib/screenshots";
import { ADULT_PREF_EVENT, alwaysShowAdult } from "@/lib/adult-consent";
import { clampText } from "@/lib/utils";
import { mediaKindOf, type MediaKind } from "@/lib/media";
import { tweetIdOf, tweetLookFor } from "@/lib/tweet-media";

/**
 * A site shown as a picture rather than a line.
 *
 * Explore and History are the same object seen twice -- a list of sites you
 * can tap into -- and they already share a compact row. This is the tall form
 * of the same idea, shared for the same reason: a second implementation is how
 * two screens drift apart.
 *
 * The two screens differ in exactly one way, and it is about cost rather than
 * looks. Explore puts a picture on its top three and nothing below, so those
 * three ask for their capture the moment they mount. History puts a picture on
 * every entry, and a collection of forty would be forty headless browser
 * sessions on someone else's paid account -- so it asks only for what is close
 * to the viewport, and never asks twice.
 */

export type CardFace = {
  id: string;
  url: string;
  domain: string;
  title: string;
  description: string | null;
  /** og:image, the understudy when no capture can be taken. */
  image: string | null;
  /** Adult, and covered unless the reader has said not to bother. */
  adult: boolean;
};

export function BoardCard({
  face,
  meta,
  rank,
  tag,
  lead = false,
  lazy = false,
  actions,
  onOpen,
}: {
  face: CardFace;
  /** The uppercase line above the title. */
  meta: ReactNode;
  /** Shown in the corner of the picture. Omitted where order means nothing. */
  rank?: number | undefined;
  /** A word in the corner instead of a number: "Bookmarked", "Yours". */
  tag?: string | undefined;
  /** The first card on a screen: bigger type, and its picture loads first. */
  lead?: boolean | undefined;
  /** Wait until the card is near the viewport before paying for a capture. */
  lazy?: boolean | undefined;
  /** Controls beside the title. Siblings of the button, never inside it. */
  actions?: ReactNode | undefined;
  onOpen: () => void;
}) {
  return (
    <div>
      <button type="button" onClick={onOpen} style={{ ...RESET, width: "100%" }}>
        <Shot face={face} rank={rank} tag={tag} lead={lead} lazy={lazy} />
        <span style={{ display: "block", marginTop: 14 }}>
          <span style={META}>{meta}</span>
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
                color: CARD_MUTED,
              }}
            >
              {clampText(face.description, lead ? 190 : 140)}
            </span>
          ) : null}
        </span>
      </button>
      {actions ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10 }}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The picture at the top of a card.
 *
 * Until one lands the frame holds its own shape and shows the domain over a
 * slow sheen, so the wait reads as a picture arriving rather than as an empty
 * box. The sheen stops the moment the request settles, whether or not it
 * produced anything.
 *
 * The source falls back rather than fails: the resized capture, then the
 * full-size original if the transformer would not serve it, then og_image,
 * then nothing at all.
 *
 * Three kinds of address never reach that chain, because a capture is the
 * wrong answer for them:
 *
 *   a link that IS media       the file itself, at whatever shape it is
 *   a post on X                the clip inside the post (see lib/tweet-media)
 *   a post on X, refused       nothing, and the frame says why
 *
 * That last one is deliberate. A screenshot of a post X will not show a
 * logged-out reader is a photograph of a login wall -- accurate, identical for
 * every such post, and worse than an honest empty frame.
 */
function Shot({
  face,
  rank,
  tag,
  lead,
  lazy,
}: {
  face: CardFace;
  rank: number | undefined;
  tag: string | undefined;
  lead: boolean;
  lazy: boolean;
}) {
  const [shot, setShot] = useState<Screenshot | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [kind, setKind] = useState<MediaKind>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [ratio, setRatio] = useState<number>(SHOT_RATIO);
  // What a post on X turned out to be, when the address is one. Never a
  // capture: a screenshot of x.com is a photograph of a login wall, identical
  // for every post ever saved, and saying nothing is better than saying that.
  const [post, setPost] = useState<PostState>(null);
  const [settled, setSettled] = useState(false);
  // Starts true for an eager card so there is no extra render before it asks.
  const [near, setNear] = useState(!lazy);
  // An adult entry ranks like anything else, but its picture is not put on a
  // board uninvited -- a screenshot IS the site, and seeing it is exactly what
  // the content warning exists to ask about. Unless the reader has turned that
  // warning off, in which case there is nothing left to protect them from.
  const [covered, setCovered] = useState(face.adult);
  // A post the platform itself marks sensitive. Kept apart from `covered`
  // rather than folded into it, because it is only known once the post has
  // been fetched -- and feeding it back into the condition the fetch depends
  // on would restart the fetch that produced it.
  const [sensitive, setSensitive] = useState(false);
  const [allowAdult, setAllowAdult] = useState(false);
  const direct = mediaKindOf(face.url);
  const isPost = tweetIdOf(face.url) !== null;
  const frame = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const decide = () => {
      const allow = alwaysShowAdult();
      setAllowAdult(allow);
      setCovered(face.adult && !allow);
    };
    decide();
    window.addEventListener(ADULT_PREF_EVENT, decide);
    return () => window.removeEventListener(ADULT_PREF_EVENT, decide);
  }, [face.adult]);

  useEffect(() => {
    if (near) return;
    const node = frame.current;
    if (!node) return;
    // A screen ahead: far enough that the picture is usually there by the time
    // the card is, close enough that scrolling past forty rows does not start
    // forty browser sessions.
    //
    // Watched against whatever actually scrolls, which on these screens is a
    // panel rather than the window. That distinction is the whole margin: an
    // observer left on the viewport is clipped by the panel, so a card one
    // pixel below the panel's edge reads as invisible no matter how large the
    // margin is, and the lookahead quietly becomes no lookahead at all. Seen
    // here as a card that never loaded until it was fully on screen.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { root: scrollParent(node), rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    let live = true;
    setShot(null);
    setSrc(null);
    setKind(null);
    setPoster(null);
    setRatio(SHOT_RATIO);
    setSensitive(false);
    setPost(null);
    setSettled(false);
    if (!near) return;
    if (covered) {
      setSettled(true);
      return;
    }
    // A direct link to media needs no capture: the thing itself is the
    // picture, and a still of a gif is the one thing a gif is not. Its shape
    // is unknown until it loads, so the frame keeps the default until then.
    if (direct !== null) {
      setKind(direct);
      setSrc(face.url);
      setSettled(true);
      return;
    }
    // A post on X. The clip inside it, at the clip's own shape.
    if (isPost) {
      tweetLookFor(face.url)
        .then((look) => {
          if (!live) return;
          if (look?.state === "media") {
            const { media } = look;
            setSensitive(media.sensitive);
            setKind(media.kind);
            setSrc(media.src);
            setPoster(media.poster);
            setRatio(shapeOf(media.width, media.height));
          } else if (look?.state === "text") {
            setPost({ kind: "text", text: look.text, author: look.author });
          } else {
            setPost({ kind: "hidden" });
          }
          setSettled(true);
        })
        .catch(() => {
          if (!live) return;
          setPost({ kind: "hidden" });
          setSettled(true);
        });
      return () => {
        live = false;
      };
    }
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
  }, [face.url, face.image, covered, near, direct, isPost]);

  // Covered either because the catalogue says so, or because X does. Same
  // panel, same preference: turning the warning off turns off both.
  const hidden = covered || (sensitive && !allowAdult);

  // One step down the chain per failure, never a loop: resized capture, then
  // the stored original, then og_image, then an honest empty frame.
  const stepDown = () => {
    // A clip from a post that will not play drops to its own still, then to
    // nothing. Never to a capture -- see the note on the component.
    if (isPost) {
      setKind(poster ? "image" : null);
      setSrc(poster);
      setPoster(null);
      return;
    }
    // A guess from the extension that turns out to be wrong drops back to the
    // ordinary path rather than to an empty frame: ask for the capture.
    if (direct !== null && src === face.url) {
      setKind(null);
      setRatio(SHOT_RATIO);
      screenshotFor(face.url)
        .then((next) => {
          setShot(next);
          setSrc(next ? next.src : face.image);
        })
        .catch(() => setSrc(null));
      return;
    }
    setSrc((current) => {
      if (!current) return null;
      if (shot && current === shot.src) return shot.full;
      if (face.image && current !== face.image) return face.image;
      return null;
    });
  };

  return (
    <span
      ref={frame}
      style={{
        display: "block",
        position: "relative",
        width: "100%",
        // Captures are 1440x900, so the frame matches rather than cropping --
        // and a clip that reports its own shape replaces that with its own.
        aspectRatio: ratio,
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "18px 24px",
          textAlign: "center",
          overflow: "hidden",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: settled ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.16)",
        }}
      >
        {post?.kind === "text" && post.text ? (
          // The post itself. Not a picture of it, and not a picture of the
          // wall in front of it -- a public post with no media is words, so
          // the frame shows the words.
          <>
            <span
              style={{
                fontSize: 16,
                fontWeight: 500,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              {clampText(post.text, 220)}
            </span>
            {post.author ? (
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.42)" }}>
                @{post.author}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span>{face.domain}</span>
            {post?.kind === "hidden" ? (
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.34)" }}>
                X shows this post only to people signed in
              </span>
            ) : null}
          </>
        )}
      </span>

      {hidden ? (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background:
              "radial-gradient(120% 90% at 50% 30%, #3a2a30 0%, #241c22 50%, #141014 100%)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.04em" }}>18+</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
            Tap to open, with a warning first
          </span>
        </span>
      ) : null}

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

      {src && !hidden && kind === "video" ? (
        // Muted, looping and inline: an autoplaying clip with sound in a list
        // is an ambush, and iOS refuses to play inline at all without both
        // muted and playsInline. The poster holds the frame while it buffers,
        // so a portrait clip does not open as a black rectangle.
        <video
          src={src}
          {...(poster ? { poster } : {})}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={stepDown}
          onLoadedData={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: poster ? 1 : 0,
            transition: "opacity 260ms ease-out",
          }}
        />
      ) : src && !hidden ? (
        <img
          src={src}
          alt=""
          // The first card's picture is the biggest thing on the screen and
          // the reason the page exists; the rest can wait their turn.
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

      {rank === undefined && tag ? (
        <span
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "inline-flex",
            alignItems: "center",
            height: 28,
            padding: "0 11px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.62)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.14)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          {tag}
        </span>
      ) : null}

      {rank !== undefined ? (
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
      ) : null}
    </span>
  );
}

/** What a link to a post on X turned out to be, once asked. */
type PostState = { kind: "text"; text: string; author: string } | { kind: "hidden" } | null;

/**
 * The nearest ancestor that scrolls, or null for the window.
 *
 * Null is the right answer for Explore, whose board scrolls the page itself,
 * and the panel is the right answer for History. Asking rather than assuming
 * means one component serves both without either knowing about the other.
 */
function scrollParent(node: HTMLElement): Element | null {
  let el = node.parentElement;
  while (el && el !== document.body) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") return el;
    el = el.parentElement;
  }
  return null;
}

/** The shape of a screenshot: 1440x900, so the frame matches rather than crops. */
const SHOT_RATIO = 16 / 10;

/**
 * A frame the shape of the thing in it, within reason.
 *
 * Portrait is the common case for anything filmed on a phone and is the whole
 * point of asking -- 91:160 is a perfectly ordinary clip. The bounds are only
 * there for the pathological: a 1:6 banner or a 20:1 panorama would make a
 * card either a sliver or most of a scroll, and neither is a card any more.
 */
const NARROWEST = 0.5;
const WIDEST = 2.4;

function shapeOf(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return SHOT_RATIO;
  return Math.min(WIDEST, Math.max(NARROWEST, width / height));
}

const CARD_MUTED = "rgba(255,255,255,0.62)";

const META: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const RESET: React.CSSProperties = {
  appearance: "none",
  background: "transparent",
  border: 0,
  margin: 0,
  padding: 0,
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};
