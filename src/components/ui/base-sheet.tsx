import { useReducedMotion } from "motion/react";
import { Drawer } from "vaul";
import { APP_CONTENT_MAX_WIDTH, NAV_HEIGHT, NAV_ROOT_SELECTOR } from "@/components/nav/navMetrics";

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
  /**
   * Show nothing at the top at all -- no centred title, no eyebrow.
   *
   * The dialog still needs an accessible name, so the title stays in the tree
   * and goes off-screen rather than being dropped. For a sheet whose contents
   * already say what it is, a heading repeating the app's own name is a line
   * of chrome above the only thing anyone came for.
   */
  hideTitle?: boolean | undefined;
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
  hideTitle,
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
      // vaul's keyboard handling writes inline `bottom` and `height` straight
      // onto this element whenever visualViewport resizes -- and those are the
      // two properties the layout below depends on. It set `bottom: 0`, which
      // dropped the sheet behind the nav and took the footer with it: on the
      // submit sheet the Submit button became unreachable the moment the
      // keyboard had been opened once. When its own `keyboardIsOpen` flag
      // missed the closing resize it left a stale `bottom` of a whole keyboard
      // height instead, which floated the sheet mid-screen and pushed its top
      // off the top of the display.
      //
      // Turned off, the sheet stays exactly where the styles below put it.
      // iOS lifts position:fixed elements above the keyboard on its own -- it
      // already does this to the bottom bar -- so a focused field still clears
      // it without anyone writing px into the DOM behind React's back.
      repositionInputs={false}
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
            // left/right 0 plus auto inline margins centres a fixed element
            // once it has a max width -- without this the sheet spans the
            // whole desktop viewport while the bar stays a 640px column.
            marginInline: "auto",
            maxWidth: APP_CONTENT_MAX_WIDTH,
            bottom: bottomOffset,
            zIndex: SHEET_Z,
            display: "flex",
            flexDirection: "column",
            maxHeight: `calc(100dvh - ${bottomOffset} - 24px)`,
            ...(height ? { height } : {}),
            paddingBottom: 8,
            // Closed on all four sides. This sheet does not sit on the bottom
            // of the screen -- it stops where the bar begins -- so its lower
            // edge is as visible as its upper one. Left open, the footer bled
            // into the black behind it with nothing to say where the sheet
            // ended, which is most obvious with a keyboard up and the whole
            // sheet raised clear of the bar.
            borderRadius: 22,
            // Same chrome tokens as the bottom bar, so a themed sheet and a
            // themed bar can never look like two different apps.
            background: "var(--app-chrome-bg, #000000)",
            color: "var(--app-chrome-fg, #ffffff)",
            border: "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
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

          <div
            style={{
              flex: "0 0 auto",
              // With nothing visible in it, the block still owned 28px of
              // vertical space and pushed the first real row down. What is
              // left is breathing room rather than a title's worth of it: a
              // header sitting 8px under the drag handle reads as pinned to
              // the top edge, so it clears it properly instead.
              padding: hideTitle
                ? description
                  ? "18px 20px 10px"
                  : "18px 20px 0"
                : eyebrow
                  ? "14px 20px 10px"
                  : "16px 20px 12px",
            }}
          >
            {hideTitle ? (
              <Drawer.Title style={SR_ONLY}>{title}</Drawer.Title>
            ) : eyebrow ? (
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
              }}
            >
              {footer}
            </div>
          ) : null}

          {/* No visible close button: the sheet is dismissed by dragging it
              down, tapping outside it, or Escape, and an X competing with all
              three is clutter. This one stays for assistive tech only -- it is
              off-screen, not hidden from the accessibility tree, so a screen
              reader still finds a labeled way out. */}
          <Drawer.Close asChild>
            <button aria-label={`Close ${title}`} style={SR_ONLY} />
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
