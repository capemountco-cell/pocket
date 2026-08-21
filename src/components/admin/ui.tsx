import type { CSSProperties, ReactNode } from "react";

/**
 * The console's small vocabulary.
 *
 * Everything here is deliberately plain: black ground, white ink, one accent
 * for anything destructive, and no rules between things. An operator screen
 * earns its keep by making state legible at a glance, so the styling stays
 * out of the way of the numbers.
 */

export const INK = "#ffffff";
export const MUTED = "rgba(255,255,255,0.58)";
export const FAINT = "rgba(255,255,255,0.34)";
export const LINE = "rgba(255,255,255,0.10)";
export const SURFACE = "rgba(255,255,255,0.045)";
export const DANGER = "#ff6b5e";

export const RESET: CSSProperties = {
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

export function Btn({
  children,
  onClick,
  tone = "quiet",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "quiet" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const primary = tone === "primary";
  const danger = tone === "danger";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...RESET,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 38,
        padding: "0 15px",
        borderRadius: 10,
        border: `1px solid ${primary ? INK : danger ? "rgba(255,107,94,0.42)" : LINE}`,
        background: primary ? INK : "transparent",
        color: primary ? "#000000" : danger ? DANGER : INK,
        fontSize: 14,
        fontWeight: 650,
        letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline,
  autoFocus,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "search";
  multiline?: boolean;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const shared: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    borderRadius: 11,
    border: `1px solid ${LINE}`,
    background: SURFACE,
    color: INK,
    fontFamily: "inherit",
    fontSize: 15,
    outline: "none",
  };
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          marginBottom: 6,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: FAINT,
        }}
      >
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? ""}
          rows={5}
          style={{ ...shared, resize: "vertical", lineHeight: 1.45 }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) onEnter();
          }}
          placeholder={placeholder ?? ""}
          type={type}
          autoFocus={autoFocus === true}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={shared}
        />
      )}
    </label>
  );
}

/** A block of related controls or readings. */
export function Panel({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 26 }}>
      {title ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 11,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: FAINT,
            }}
          >
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Anything the console needs to say in words. */
export function Note({ text, tone = "muted" }: { text: string; tone?: "muted" | "danger" }) {
  return (
    <p
      role="status"
      aria-live="polite"
      style={{
        margin: "14px 0",
        fontSize: 14,
        lineHeight: 1.5,
        color: tone === "danger" ? DANGER : MUTED,
      }}
    >
      {text}
    </p>
  );
}

export function Chip({
  children,
  tone = "quiet",
}: {
  children: ReactNode;
  tone?: "quiet" | "warn";
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 8px",
        borderRadius: 999,
        border: `1px solid ${tone === "warn" ? "rgba(255,107,94,0.4)" : LINE}`,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: tone === "warn" ? DANGER : FAINT,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** A row in a list: no rules, separated by its own breathing room. */
export function Row({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "14px 15px",
        marginBottom: 8,
        borderRadius: 13,
        background: SURFACE,
        border: `1px solid ${LINE}`,
      }}
    >
      {children}
    </div>
  );
}
