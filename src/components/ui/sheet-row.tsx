import { motion, useReducedMotion } from "motion/react";

// The list row every sheet is built from: icon, label, optional trailing
// slot, an optional second action, optional destructive tone, optional
// "not yet" state. One primitive rather than five near-identical row
// implementations -- a second lookalike would be the defect, not the shortcut.
export const SHEET_ROW_HEIGHT = 56;

const HAIRLINE = "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))";

export type SheetRowAction = {
  icon: React.ReactNode;
  /** Accessible name — the action is icon-only. */
  label: string;
  onClick: () => void;
};

export type SheetRowProps = {
  icon: React.ReactNode;
  label: string;
  /** Right-hand slot: a badge, a value, a status word. Never interactive. */
  trailing?: React.ReactNode | undefined;
  /** A second, separate intent on the same row (remove, edit). Rendered as its
   *  own button beside the row rather than inside it — an interactive element
   *  nested in a button is neither valid HTML nor reachable by keyboard. */
  action?: SheetRowAction | undefined;
  onClick?: (() => void) | undefined;
  /** Reserved-but-unavailable: dimmed, not focusable, announced as disabled. */
  disabled?: boolean | undefined;
  /** Reserved for genuinely destructive intent (report, delete). */
  tone?: "default" | "destructive" | undefined;
  /** Marks the row as the current selection for a picker. */
  selected?: boolean | undefined;
};

export function SheetRow({
  icon,
  label,
  trailing,
  action,
  onClick,
  disabled,
  tone = "default",
  selected,
}: SheetRowProps) {
  const reduceMotion = useReducedMotion();
  const ink =
    tone === "destructive" ? "var(--app-destructive, #FF453A)" : "var(--app-chrome-fg, #ffffff)";

  const button = (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      aria-current={selected ? "true" : undefined}
      {...(reduceMotion || disabled ? {} : { whileTap: { scale: 0.985 } })}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        // A <button> shrink-wraps its content even as a flex container, so the
        // width is stated explicitly -- without it the row's hairline stops
        // at the end of the label instead of spanning the sheet.
        width: "100%",
        flex: "1 1 auto",
        minWidth: 0,
        minHeight: SHEET_ROW_HEIGHT,
        padding: action ? "0 0 0 20px" : "0 20px",
        background: "transparent",
        border: 0,
        // With a sibling action the hairline belongs to the wrapper, so the
        // rule spans the full row instead of stopping at the label.
        borderTop: action ? 0 : HAIRLINE,
        color: ink,
        opacity: disabled ? 0.45 : 1,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 17,
        fontWeight: 500,
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: "inline-flex", flex: "0 0 auto", width: 22, justifyContent: "center" }}
      >
        {icon}
      </span>
      <span
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {trailing ? <span style={{ flex: "0 0 auto" }}>{trailing}</span> : null}
    </motion.button>
  );

  if (!action) return button;

  return (
    <div style={{ display: "flex", alignItems: "stretch", borderTop: HAIRLINE }}>
      {button}
      <button
        type="button"
        onClick={action.onClick}
        aria-label={action.label}
        style={{
          display: "inline-flex",
          flex: "0 0 auto",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          minHeight: SHEET_ROW_HEIGHT,
          background: "transparent",
          border: 0,
          color: "var(--app-chrome-muted, #9c9c97)",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {action.icon}
      </button>
    </div>
  );
}

// The pill the design uses for a row that is deliberately reserved. Paired
// with the row's `disabled` state so the meaning is never carried by dimming
// alone.
export function SheetRowBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 26,
        padding: "0 12px",
        borderRadius: 999,
        background: "var(--app-chrome-fill, #161616)",
        color: "var(--app-chrome-muted, #9c9c97)",
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
