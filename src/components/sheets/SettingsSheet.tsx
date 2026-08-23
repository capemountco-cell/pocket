import { BaseSheet } from "@/components/ui/base-sheet";
import { THEMES, getCurrentTheme, setTheme, subscribeTheme, type ThemeKey } from "@/lib/theme";
import { setNavStyle, useNavStyle, type NavStyle } from "@/lib/nav-style";
import { alwaysShowAdult, setAlwaysShowAdult } from "@/lib/adult-consent";
import { AvatarButton } from "@/components/AvatarButton";
import { avatarMessage, storeAvatar } from "@/lib/avatar";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { AuthState } from "@/lib/auth";

// Settings: the accent theme ramp and which of the two bottom-bar
// presentations the device uses. Both are device-local preferences, so this
// sheet works identically signed out.
export function SettingsSheet({
  open,
  onOpenChange,
  auth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auth: AuthState;
}) {
  const navStyle = useNavStyle();
  const [theme, setThemeState] = useState<ThemeKey>(() => getCurrentTheme());
  useEffect(() => subscribeTheme(setThemeState), []);

  // Read on open rather than at first render: this is localStorage, there is
  // none of it during SSR, and the sheet may have been mounted long before
  // anyone opened it.
  const [showAdult, setShowAdult] = useState(false);
  useEffect(() => {
    if (open) setShowAdult(alwaysShowAdult());
  }, [open]);

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Settings" eyebrow="Settings">
      {auth.session ? (
        <section style={{ padding: "6px 20px 4px" }}>
          <h3 style={GROUP_LABEL}>Picture</h3>
          <PictureRow auth={auth} />
        </section>
      ) : null}

      <section style={{ padding: auth.session ? "18px 20px 4px" : "6px 20px 4px" }}>
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

      <section style={{ padding: "18px 20px 4px" }}>
        <h3 style={GROUP_LABEL}>Sensitive content</h3>
        <Toggle
          label="Skip the content warning"
          hint="Adult sites open straight away, and show their picture on the boards."
          on={showAdult}
          onChange={(next) => {
            setShowAdult(next);
            setAlwaysShowAdult(next);
          }}
        />
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

/**
 * The picture, with the two things you can do to it.
 *
 * The same tap-the-face gesture as the menu header rather than a second way of
 * doing it, so whichever one someone finds first teaches the other. Removing
 * lives only here: it is the rarer action and it does not deserve a second
 * control sitting on the face itself.
 */
function PictureRow({ auth }: { auth: AuthState }) {
  const [busy, setBusy] = useState(false);
  const has = Boolean(auth.profile?.avatar_url);
  const userId = auth.user?.id ?? auth.profile?.id ?? "";

  const remove = async () => {
    setBusy(true);
    try {
      await storeAvatar(userId, null);
      await auth.refreshProfile();
      toast("Picture removed");
    } catch (error) {
      toast(avatarMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
      <AvatarButton auth={auth} size={64} />
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          {has ? "Tap to change it" : "Tap to add one"}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            lineHeight: 1.4,
            color: "var(--app-chrome-muted, #9c9c97)",
          }}
        >
          Squared off and shrunk to 256px before it is saved.
        </p>
      </div>
      {has ? (
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          style={{
            appearance: "none",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
            background: "transparent",
            color: "var(--app-chrome-fg, #ffffff)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            WebkitTapHighlightColor: "transparent",
            flex: "0 0 auto",
          }}
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

/**
 * A setting with two states and a sentence saying what they mean.
 *
 * The switch is drawn rather than a checkbox because a checkbox on a black
 * sheet inherits the platform's own colours, which are not this app's. It is
 * still a real button with `role="switch"`, so it announces and behaves like
 * one however it looks.
 */
function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        minHeight: 56,
        marginTop: 12,
        padding: 0,
        border: 0,
        background: "transparent",
        color: "var(--app-chrome-fg, #ffffff)",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "left",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: 600 }}>{label}</span>
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontSize: 13,
            lineHeight: 1.4,
            color: "var(--app-chrome-muted, #9c9c97)",
          }}
        >
          {hint}
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          position: "relative",
          width: 50,
          height: 30,
          borderRadius: 999,
          background: on ? "var(--app-chrome-fg, #ffffff)" : "transparent",
          border: on
            ? "1.5px solid var(--app-chrome-fg, #ffffff)"
            : "1.5px solid var(--app-chrome-border, rgba(255,255,255,0.28))",
          transition: "background 140ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 23 : 3,
            width: 21,
            height: 21,
            borderRadius: 999,
            background: on ? "var(--app-chrome-bg, #000000)" : "var(--app-chrome-muted, #9c9c97)",
            transition: "left 140ms ease",
          }}
        />
      </span>
    </button>
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
