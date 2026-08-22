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
export function BidCta({ board, onPlaced }: { board: BidBoard; onPlaced: () => void }) {
  const [cents, setCents] = useState(() => claimTopCents(board));
  const [url, setUrl] = useState("");
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
          <span style={{ color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{money(cents)}</span>
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
        <span style={{ color: ACCENT }}>New spots start at {money(board.minCents)}.</span> Paying
        less than the top price still puts you on the board, at whatever place that bid can take.
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
          aria-label="The address you want on the board"
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
            background: url.trim().length === 0 ? "rgba(255,255,255,0.14)" : ACCENT,
            color: url.trim().length === 0 ? "rgba(255,255,255,0.5)" : "#140b08",
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
        <p style={{ margin: "10px 2px 0", fontSize: 13, lineHeight: 1.45, color: FAINT }}>
          Already on the board? Enter the same address and raise your bid.
        </p>
      </div>
    </section>
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
        border: 0,
        background: "rgba(255,255,255,0.10)",
        color: disabled ? "rgba(255,255,255,0.28)" : "#ffffff",
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

const ACCENT = "var(--app-accent-warm, #E5C800)";
const MUTED = "rgba(255,255,255,0.62)";
const FAINT = "rgba(255,255,255,0.40)";
