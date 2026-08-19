import { MenuIcon, ReactIcon, SendToIcon, SubmitIcon, ICON_REGISTRY } from "@/components/icons";
import { useNavActions } from "./useNavActions";
import { useLogoPulse } from "./useLogoPulse";
import { BrandMark } from "./BrandMark";
import { NavButton } from "./NavButton";
import { NAV_BALANCED_PAD, NAV_HEIGHT } from "./navMetrics";
import type { BottomNavProps } from "./types";

// Slightly smaller than Classic's 31px glyph so Modern keeps its more
// compact composition; ~9% smaller than MODERN_BRAND_SIZE, same ratio as
// Classic vs. its brand mark.
const MODERN_ICON_SIZE = 24;
const MODERN_BRAND_SIZE = 38;

// The Modern bar is solid black on every theme (see .app-modern-dock in
// styles.css), so its ink is fixed white rather than the theme chrome token.
const INK = "#ffffff";

// Modern navigation: a full-bleed solid-black bar docked to the bottom edge
// (no floating pill, no translucency). Reuses the exact same action logic,
// brand mark, and button primitive as ClassicNav -- only the shell around
// them differs: switching nav style must never duplicate business logic.
export function ModernNav(props: BottomNavProps) {
  const {
    onDiscover,
    isSaved,
    reactActive,
    glowMenu,
    menuUnread,
    glowSubmit,
    logoRef,
    navRef,
    logoPulseKey,
  } = props;

  const { handleMenuTap, handleReactTap, handleSendToTap, handleSubmitTap } = useNavActions(props);

  const setLogoRefs = useLogoPulse(logoPulseKey, logoRef);

  return (
    <nav
      ref={navRef}
      aria-label="Primary actions"
      className="app-modern-dock"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
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
          maxWidth: 640,
          width: "100%",
        }}
      >
        <NavButton label="Menu" ink={INK} fontSize={14} onClick={handleMenuTap}>
          <span style={{ position: "relative", display: "inline-flex" }}>
            <MenuIcon size={MODERN_ICON_SIZE} glowKey={glowMenu} />
            {menuUnread && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -2,
                  right: -3,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: ICON_REGISTRY.menu.accentColor,
                  border: "1.5px solid #000000",
                  boxSizing: "content-box",
                }}
              />
            )}
          </span>
        </NavButton>

        <NavButton
          label="React"
          ink={INK}
          fontSize={14}
          onClick={handleReactTap}
          active={reactActive}
        >
          <ReactIcon size={MODERN_ICON_SIZE} state={reactActive ? "active" : "idle"} />
        </NavButton>

        <button
          onClick={onDiscover}
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
          <BrandMark size={MODERN_BRAND_SIZE} logoRef={setLogoRefs} />
        </button>

        <NavButton
          label="Send to"
          ink={INK}
          fontSize={14}
          onClick={handleSendToTap}
          active={isSaved}
        >
          <SendToIcon size={MODERN_ICON_SIZE} state={isSaved ? "active" : "idle"} />
        </NavButton>

        <NavButton label="Submit a site" ink={INK} fontSize={14} onClick={handleSubmitTap}>
          <SubmitIcon size={MODERN_ICON_SIZE} glowKey={glowSubmit} />
        </NavButton>
      </div>
    </nav>
  );
}
