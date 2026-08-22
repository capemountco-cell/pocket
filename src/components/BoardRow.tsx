import type { ReactNode } from "react";
import { SiteIcon } from "@/components/SiteIcon";

/**
 * One entry on a board.
 *
 * Explore and the collection are the same object seen twice -- a list of
 * sites you can tap into -- so they share a row rather than each growing a
 * lookalike. A second implementation is how two screens drift apart.
 *
 * Left to right: a rank or a label, the site's icon, who it is and what it
 * does, then whatever the board wants to say about it, then any actions.
 */
export const BOARD_MUTED = "rgba(255,255,255,0.62)";

export function BoardRow({
  domain,
  icon,
  title,
  description,
  lead,
  trailing,
  actions,
  onOpen,
}: {
  domain: string;
  /** Resolved icon address, or null when the catalogue found none. */
  icon: string | null;
  /** The bold line. Usually the domain; the collection shows the real title. */
  title: string;
  description?: string | null | undefined;
  /** Rank number, or a short label like "#4". */
  lead?: ReactNode | undefined;
  /** Right-hand stat. */
  trailing?: ReactNode | undefined;
  /** Buttons beside the row. Siblings, never nested inside the row button. */
  actions?: ReactNode | undefined;
  onOpen: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        type="button"
        onClick={onOpen}
        style={{
          appearance: "none",
          background: "transparent",
          border: 0,
          margin: 0,
          color: "inherit",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          flex: "1 1 auto",
          minWidth: 0,
          display: "flex",
          gap: 13,
          alignItems: "center",
          // Rows are separated by their own height now that the rules are
          // gone, so the padding is what keeps them from touching.
          padding: "15px 0",
        }}
      >
        {lead !== undefined ? (
          <span
            aria-hidden="true"
            style={{
              flex: "0 0 auto",
              minWidth: 24,
              fontSize: 13.5,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "rgba(255,255,255,0.34)",
            }}
          >
            {lead}
          </span>
        ) : null}

        <SiteIcon domain={domain} icon={icon} />

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
            {title}
          </span>
          {description ? (
            <span
              style={{
                display: "block",
                marginTop: 2,
                fontSize: 13.5,
                lineHeight: 1.35,
                color: BOARD_MUTED,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {description}
            </span>
          ) : null}
        </span>

        {trailing ? <span style={{ flex: "0 0 auto" }}>{trailing}</span> : null}
      </button>
      {actions}
    </div>
  );
}

/** The right-hand stat, with its unit. A bare integer reads as a rank. */
export function BoardStat({ value, unit }: { value: number; unit: string }) {
  return (
    <span
      style={{
        fontSize: 13.5,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        color: "rgba(255,255,255,0.55)",
        whiteSpace: "nowrap",
      }}
    >
      {value}
      <span style={{ marginLeft: 4, fontWeight: 600, color: "rgba(255,255,255,0.34)" }}>
        {unit}
      </span>
    </span>
  );
}

/** Marks a row as bought rather than earned. */
export function BoardPaidTag() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 7px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.5)",
      }}
    >
      Ad
    </span>
  );
}
