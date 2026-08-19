import { BaseSheet } from "@/components/ui/base-sheet";
import { THEMES, getCurrentTheme, setTheme, subscribeTheme, type ThemeKey } from "@/lib/theme";
import { setNavStyle, useNavStyle, type NavStyle } from "@/lib/nav-style";
import { useEffect, useState } from "react";

// Appearance: the accent theme ramp and which of the two bottom-bar
// presentations the device uses. Both are device-local preferences, so this
// sheet works identically signed out.
export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navStyle = useNavStyle();
  const [theme, setThemeState] = useState<ThemeKey>(() => getCurrentTheme());
  useEffect(() => subscribeTheme(setThemeState), []);

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Appearance" eyebrow="Appearance">
      <section style={{ padding: "6px 20px 4px" }}>
        <h3 style={GROUP_LABEL}>Theme</h3>
        <div
          role="radiogroup"
          aria-label="Theme"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {THEMES.map((t) => {
            const active = t.key === theme;
            return (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t.label}
                onClick={() => setTheme(t.key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 44,
                  padding: 0,
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    background: t.base,
                    // Selection is a ring plus the label weight below, never
                    // colour alone.
                    boxSizing: "border-box",
                    border: active
                      ? "3px solid var(--app-chrome-fg, #ffffff)"
                      : "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    color: active
                      ? "var(--app-chrome-fg, #ffffff)"
                      : "var(--app-chrome-muted, #9c9c97)",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ padding: "18px 20px 22px" }}>
        <h3 style={GROUP_LABEL}>Bottom bar</h3>
        <div
          role="radiogroup"
          aria-label="Bottom bar style"
          style={{ display: "flex", gap: 10, marginTop: 12 }}
        >
          <NavStyleOption
            value="modern"
            label="Modern"
            hint="Solid black dock"
            current={navStyle}
          />
          <NavStyleOption
            value="classic"
            label="Classic"
            hint="Themed full-width bar"
            current={navStyle}
          />
        </div>
      </section>
    </BaseSheet>
  );
}

function NavStyleOption({
  value,
  label,
  hint,
  current,
}: {
  value: NavStyle;
  label: string;
  hint: string;
  current: NavStyle;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => setNavStyle(value)}
      style={{
        flex: "1 1 0",
        minHeight: 64,
        padding: "10px 14px",
        borderRadius: 14,
        textAlign: "left",
        background: active ? "var(--app-chrome-fill, #161616)" : "transparent",
        border: active
          ? "1.5px solid var(--app-chrome-fg, #ffffff)"
          : "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
        color: "var(--app-chrome-fg, #ffffff)",
        fontFamily: "Inter, system-ui, sans-serif",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{label}</span>
      <span style={{ display: "block", fontSize: 13, color: "var(--app-chrome-muted, #9c9c97)" }}>
        {hint}
      </span>
    </button>
  );
}

const GROUP_LABEL: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--app-chrome-muted, #9c9c97)",
};
