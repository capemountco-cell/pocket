import { MenuIcon, ReactIcon, SendToIcon, SubmitIcon, ICON_REGISTRY } from "@/components/icons";
import { useLogoPulse } from "./useLogoPulse";
import { BrandMark } from "./BrandMark";
import { NavButton } from "./NavButton";
import { APP_CONTENT_MAX_WIDTH, NAV_BALANCED_PAD, NAV_HEIGHT } from "./navMetrics";
import type { NavStyleProps } from "./types";

// Visual size of each action symbol (see AppIcon). Tuned to read clearly on
// iPhone while still leaving enough column width for a >=44px tap target at
// the narrowest supported viewport (iPhone SE, 320px). ~9% smaller than the
// center brand mark (44px) so the four side icons read as intentionally
// secondary to it.
const NAV_ICON_SIZE = 31;

// Theme-aware chrome tokens. On White these fall back to the original
// colors; on a colored theme they tint the bar and its icons.
const INK = "var(--app-chrome-fg, #111111)";
const SURFACE = "var(--app-chrome-bg, #ffffff)";

// The full-width fixed bottom bar. Preserved pixel-for-pixel — this is what
// "Classic" means.
export function ClassicNav(props: NavStyleProps) {
  const { slots, glowMenu, menuUnread, glowSubmit, logoRef, navRef, logoPulseKey } = props;
  const { onMenuTap, onReactTap, onDiscoverTap, onSendToTap, onSubmitTap, isSaved, reactActive } =
    slots;

  const setLogoRefs = useLogoPulse(logoPulseKey, logoRef);

  return (
    <nav
      ref={navRef}
      aria-label="Primary actions"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: SURFACE,
        padding: 0,
        paddingTop: NAV_BALANCED_PAD,
        paddingBottom: NAV_BALANCED_PAD,
        height: NAV_HEIGHT,
        boxSizing: "border-box",
        // Permanent hardening: the nav is a fixed overlay that must sit on top
        // of every view (discovery, saved, sheets). No view may hide it.
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.65fr 1fr 1fr",
          alignItems: "stretch",
          height: "100%",
          padding: 0,
          margin: "0 auto",
          maxWidth: APP_CONTENT_MAX_WIDTH,
          width: "100%",
        }}
      >
        <NavButton label="Menu" ink={INK} onClick={onMenuTap}>
          <span style={{ position: "relative", display: "inline-flex" }}>
            <MenuIcon size={NAV_ICON_SIZE} glowKey={glowMenu} />
            {menuUnread && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -2,
                  right: -3,
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: ICON_REGISTRY.menu.accentColor,
                  border: "1.5px solid " + SURFACE,
                  boxSizing: "content-box",
                }}
              />
            )}
          </span>
        </NavButton>

        <NavButton label="React" ink={INK} onClick={onReactTap} active={reactActive}>
          <ReactIcon size={NAV_ICON_SIZE} state={reactActive ? "active" : "idle"} />
        </NavButton>

        <button
          onClick={onDiscoverTap}
          aria-label="Show me a site"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
            height: "100%",
            padding: 0,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            outline: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <BrandMark size={44} logoRef={setLogoRefs} />
        </button>

        <NavButton label="Send to" ink={INK} onClick={onSendToTap} active={isSaved}>
          <SendToIcon size={NAV_ICON_SIZE} state={isSaved ? "active" : "idle"} />
        </NavButton>

        <NavButton label="Submit a site" ink={INK} onClick={onSubmitTap}>
          <SubmitIcon size={NAV_ICON_SIZE} glowKey={glowSubmit} />
        </NavButton>
      </div>
    </nav>
  );
}
