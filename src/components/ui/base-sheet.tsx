import { useReducedMotion } from "motion/react";
import { Drawer } from "vaul";
import { NAV_HEIGHT, NAV_ROOT_SELECTOR } from "@/components/nav/navMetrics";

// The ONE sheet primitive. Every feature sheet in components/sheets/ consumes
// this; nothing else in the app touches vaul or hand-rolls a fixed overlay
// with its own drag math. Everything a modal surface has to get right --
// focus trap and restore, aria-modal, Escape, scroll lock, drag-to-dismiss
// with a velocity-aware snap, safe-area padding, chrome theming -- is settled
// here once so no screen can get a subset of it. Need something this can't
// do? Add a prop; never drop to the primitive for one screen.

export type SheetSize = "auto" | "half" | "full";

// Sheets sit UNDER the bottom nav (z-index 50) rather than over it: the nav is
// a permanent overlay no view may hide. The sheet's box *ends* where the nav
// begins (`bottom: bottomOffset`) rather than padding itself clear of it, so
// the two can never overlap and a drag-dismiss slides behind the bar instead
// of across it. The overlay stays below both, so the bar is never dimmed.
const OVERLAY_Z = 40;
const SHEET_Z = 45;

const SIZE_HEIGHT: Record<SheetSize, string | undefined> = {
  auto: undefined,
  half: "50dvh",
  full: "92dvh",
};

export type BaseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name for the dialog. Rendered as the visible title unless an `eyebrow` replaces it. */
  title: string;
  /** Small uppercase section label shown instead of a centred title. */
  eyebrow?: string | undefined;
  /** Optional supporting line under the title. Also the dialog's description. */
  description?: string | undefined;
  size?: SheetSize | undefined;
  /** Space kept clear at the bottom, so the sheet clears the nav. */
  bottomOffset?: string | undefined;
  /** Sticky above the scrolling body. */
  header?: React.ReactNode | undefined;
  /** Sticky below the scrolling body — primary actions live here. */
  footer?: React.ReactNode | undefined;
  children?: React.ReactNode | undefined;
};

export function BaseSheet({
  open,
  onOpenChange,
  title,
  eyebrow,
  description,
  size = "auto",
  bottomOffset = NAV_HEIGHT,
  header,
  footer,
  children,
}: BaseSheetProps) {
  const reduceMotion = useReducedMotion();
  const height = SIZE_HEIGHT[size];

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
      // Dragging is the gesture people reach for first on a phone; vaul's
      // snap is velocity-aware, so a flick dismisses even from near the top.
      dismissible
    >
      <Drawer.Portal>
        <Drawer.Overlay
          className={reduceMotion ? "app-sheet-overlay app-sheet-instant" : "app-sheet-overlay"}
          style={{ position: "fixed", inset: 0, zIndex: OVERLAY_Z, background: "rgba(0,0,0,0.55)" }}
        />
        <Drawer.Content
          className={reduceMotion ? "app-sheet app-sheet-instant" : "app-sheet"}
          // The bottom bar stays live under every sheet, so a tap on it is a
          // slot tap, not a dismissal. Without this the bar's own handler
          // would race this dismiss and the outcome would depend on event
          // ordering rather than on what the person actually pressed.
          onPointerDownOutside={(event) => {
            const target = event.target;
            if (target instanceof Element && target.closest(NAV_ROOT_SELECTOR)) {
              event.preventDefault();
            }
          }}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: bottomOffset,
            zIndex: SHEET_Z,
            display: "flex",
            flexDirection: "column",
            maxHeight: `calc(100dvh - ${bottomOffset} - 24px)`,
            ...(height ? { height } : {}),
            paddingBottom: 8,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            // Same chrome tokens as the bottom bar, so a themed sheet and a
            // themed bar can never look like two different apps.
            background: "var(--app-chrome-bg, #000000)",
            color: "var(--app-chrome-fg, #ffffff)",
            border: "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
            borderBottom: 0,
            fontFamily: "Inter, system-ui, sans-serif",
            outline: "none",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              flex: "0 0 auto",
              width: 44,
              height: 5,
              borderRadius: 999,
              margin: "10px auto 0",
              background: "var(--app-chrome-muted, #9c9c97)",
              opacity: 0.7,
            }}
          />

          <div style={{ flex: "0 0 auto", padding: eyebrow ? "14px 20px 10px" : "16px 20px 12px" }}>
            {eyebrow ? (
              <>
                {/* The dialog still needs an accessible name even when the
                    design shows only a section label. */}
                <Drawer.Title style={SR_ONLY}>{title}</Drawer.Title>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--app-chrome-muted, #9c9c97)",
                  }}
                >
                  {eyebrow}
                </p>
              </>
            ) : (
              <Drawer.Title
                style={{
                  margin: 0,
                  textAlign: "center",
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "var(--app-chrome-fg, #ffffff)",
                }}
              >
                {title}
              </Drawer.Title>
            )}

            {description ? (
              <Drawer.Description
                style={{
                  margin: eyebrow ? "6px 0 0" : "8px 0 0",
                  textAlign: eyebrow ? "left" : "center",
                  fontSize: 15,
                  lineHeight: 1.4,
                  color: "var(--app-chrome-muted, #9c9c97)",
                }}
              >
                {description}
              </Drawer.Description>
            ) : (
              // Radix warns when a dialog has no description; say so explicitly
              // rather than leaving the association dangling.
              <Drawer.Description style={SR_ONLY}>{title}</Drawer.Description>
            )}
          </div>

          {header ? <div style={{ flex: "0 0 auto", padding: "0 20px 12px" }}>{header}</div> : null}

          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {children}
          </div>

          {footer ? (
            <div
              style={{
                flex: "0 0 auto",
                padding: "12px 20px 4px",
                borderTop: "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
              }}
            >
              {footer}
            </div>
          ) : null}

          {/* Every sheet is dismissible by drag and by Escape; this is the
              labeled target that makes it dismissible by tap for people who
              use neither. */}
          <Drawer.Close asChild>
            <button
              aria-label={`Close ${title}`}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 32,
                height: 32,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: 0,
                background: "transparent",
                color: "var(--app-chrome-muted, #9c9c97)",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </Drawer.Close>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const SR_ONLY: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
