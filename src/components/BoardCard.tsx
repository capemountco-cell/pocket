import { useEffect, useRef, useState, type ReactNode } from "react";
import { screenshotFor, type Screenshot } from "@/lib/screenshots";
import { ADULT_PREF_EVENT, alwaysShowAdult } from "@/lib/adult-consent";
import { clampText } from "@/lib/utils";

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
        <Shot face={face} rank={rank} lead={lead} lazy={lazy} />
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
 */
function Shot({
  face,
  rank,
  lead,
  lazy,
}: {
  face: CardFace;
  rank: number | undefined;
  lead: boolean;
  lazy: boolean;
}) {
  const [shot, setShot] = useState<Screenshot | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  // Starts true for an eager card so there is no extra render before it asks.
  const [near, setNear] = useState(!lazy);
  // An adult entry ranks like anything else, but its picture is not put on a
  // board uninvited -- a screenshot IS the site, and seeing it is exactly what
  // the content warning exists to ask about. Unless the reader has turned that
  // warning off, in which case there is nothing left to protect them from.
  const [covered, setCovered] = useState(face.adult);
  const frame = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const decide = () => setCovered(face.adult && !alwaysShowAdult());
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
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    let live = true;
    setShot(null);
    setSrc(null);
    setSettled(false);
    if (!near) return;
    if (covered) {
      setSettled(true);
      return;
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
  }, [face.url, face.image, covered, near]);

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

  return (
    <span
      ref={frame}
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

      {covered ? (
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

      {src ? (
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
