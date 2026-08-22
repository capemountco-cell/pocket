import { useState } from "react";
import { toast } from "sonner";
import { BID_STEP_CENTS, claimTopCents, money, startBid, type BidBoard } from "@/lib/bids";
import { getDeviceId } from "@/lib/device-id";

/**
 * The ask.
 *
 * A leaderboard with no way onto it is a list; the price of first place, shown
 * as the headline with the controls to change it, is what makes it an auction.
 * So the number is the largest thing on the screen and it is adjustable in
 * place -- someone who cannot afford the top can walk the figure down and
 * still land somewhere, which is the point of the line beneath it.
 */
export function BidCta({
  board,
  onPlaced,
  initialUrl = "",
}: {
  board: BidBoard;
  onPlaced: () => void;
  /**
   * Filled in already when someone arrived here from a submission that has to
   * be paid for. Retyping an address you just typed is the fastest way to lose
   * the person between the two screens.
   */
  initialUrl?: string;
}) {
  const [cents, setCents] = useState(() => claimTopCents(board));
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);

  const rankFor = (amount: number) => {
    // Where this money would land right now. Ties go to the earlier bid, so an
    // equal amount sits behind the one already there -- matching the ordering
    // the board itself uses.
    let ahead = 0;
    for (const bid of board.bids) if (bid.amountCents >= amount) ahead += 1;
    return ahead + 1;
  };

  const rank = rankFor(cents);
  const step = (delta: number) =>
    setCents((c) => Math.max(board.minCents, c + delta * BID_STEP_CENTS));

  const place = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const deviceId = getDeviceId();
    if (!deviceId) return;
    setBusy(true);
    try {
      const outcome = await startBid(trimmed, cents, deviceId);
      if (!outcome.ok) {
        toast(outcome.message);
        return;
      }
      onPlaced();
      window.location.href = outcome.url;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ padding: "8px 0 26px" }}>
      <h1
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 10,
          margin: 0,
          fontSize: 30,
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          textAlign: "center",
        }}
      >
        <span>{rank === 1 ? "Claim #1 for" : `Claim #${rank} for`}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Step label="Lower the bid" onClick={() => step(-1)} disabled={cents <= board.minCents}>
            −
          </Step>
          <span style={{ color: BID_ACCENT, fontVariantNumeric: "tabular-nums" }}>
            {money(cents)}
          </span>
          <Step label="Raise the bid" onClick={() => step(1)}>
            +
          </Step>
        </span>
      </h1>

      <p
        style={{
          margin: "12px auto 0",
          maxWidth: 420,
          fontSize: 14.5,
          lineHeight: 1.5,
          textAlign: "center",
          color: MUTED,
        }}
      >
        <span style={{ color: BID_ACCENT }}>New spots start at {money(board.minCents)}.</span>{" "}
        Paying less than the top price still puts you on the board, at whatever place that bid can
        take.
      </p>

      <div style={{ marginTop: 18 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void place();
          }}
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="The URL you want on the board"
          placeholder="yoursite.com"
          style={{
            width: "100%",
            boxSizing: "border-box",
            minHeight: 54,
            padding: "0 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.05)",
            color: "#ffffff",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 16,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => void place()}
          disabled={busy || url.trim().length === 0}
          style={{
            appearance: "none",
            width: "100%",
            marginTop: 10,
            minHeight: 54,
            borderRadius: 14,
            border: 0,
            // White until there is an address, green once there is one. The
            // grey it used to wear read as broken rather than waiting: on a
            // black screen a dim grey slab is what a dead control looks like,
            // and this is the one thing the page is asking you to do. White
            // keeps it the brightest thing here; the colour change on the way
            // to green is then a reward for filling the field rather than the
            // moment the button becomes visible at all.
            background: url.trim().length === 0 ? "#ffffff" : BID_ACCENT,
            color: BID_INK,
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 17,
            fontWeight: 750,
            letterSpacing: "-0.01em",
            cursor: url.trim().length === 0 ? "default" : "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {busy ? "Opening checkout…" : board.bids.length === 0 ? "Place the first bid" : "Outbid"}
        </button>
      </div>
    </section>
  );
}

/**
 * The footnote that used to sit under the bid button.
 *
 * Moved to the foot of the page on the owner's instruction: show it in the
 * footer, not above the fold. It answers a question nobody has yet when they
 * are looking at the button -- what happens to a site already on the board --
 * and it is exactly the question someone has after reading the board and
 * finding themselves on it.
 *
 * Small, centred and faint. It is an aside, not a second instruction.
 */
export function BidNote() {
  return (
    <p
      style={{
        margin: "18px auto 0",
        fontSize: 11.5,
        lineHeight: 1.4,
        color: FAINT,
        textAlign: "center",
        // One line at 390px, which is the size this is designed for. Not
        // nowrap: on a narrower phone a clipped sentence is worse than a
        // wrapped one, so it is allowed to fold rather than vanish.
        letterSpacing: "-0.005em",
      }}
    >
      Already listed? Re-enter your URL to keep your place.
    </p>
  );
}

function Step({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled === true}
      aria-label={label}
      style={{
        appearance: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 999,
        // A 10% fill on black is barely a shape, and the glyph inside it was
        // the only thing saying a control was there at all. The border is what
        // draws the button; the fill only separates it from the ground.
        border: `1px solid ${disabled ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.34)"}`,
        background: "rgba(255,255,255,0.06)",
        color: disabled ? "rgba(255,255,255,0.34)" : "#ffffff",
        fontSize: 19,
        fontWeight: 700,
        lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

/**
 * The auction's colour.
 *
 * Its own token rather than the shared warm accent, because it means
 * something different: that accent marks a caution -- a submission held back,
 * a neutral outcome -- and this marks the action the page is asking for. On
 * black the two also read almost identically at a glance, which is the worst
 * case for a colour whose whole job is to say "this one".
 *
 * Exported because the amounts on the board are the same fact as the price in
 * the headline, and a bid shown in one colour here and another there stops
 * looking like the same thing.
 */
export const BID_ACCENT = "#4ADE80";
/** Ink for text sitting on BID_ACCENT. Near-black, tinted so it isn't a hole. */
export const BID_INK = "#05140b";

const MUTED = "rgba(255,255,255,0.62)";
const FAINT = "rgba(255,255,255,0.40)";
