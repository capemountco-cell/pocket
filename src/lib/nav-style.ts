export const NAV_STYLE_STORAGE_KEY = "app_nav_style_v1";

export type NavStyle = "modern" | "classic";
export const DEFAULT_NAV_STYLE: NavStyle = "modern";

/** Defined once: chrome bottom padding respecting the device safe area. */
export const SAFE_BOTTOM_PAD = "max(18px, env(safe-area-inset-bottom))";

/** Fixed bar geometry, shared by both nav styles. */
export const NAV_BAR_HEIGHT = 60;
export const NAV_DOCK_HEIGHT = 56;
export const NAV_Z_INDEX = 50;

/** Space a page must reserve at its bottom so content is never hidden. */
export function navContentReserve(navStyle: NavStyle): string {
  return navStyle === "classic"
    ? `calc(${NAV_BAR_HEIGHT}px + ${SAFE_BOTTOM_PAD})`
    : SAFE_BOTTOM_PAD;
}

export function readStoredNavStyle(): NavStyle {
  if (typeof window === "undefined") return DEFAULT_NAV_STYLE;
  try {
    const raw = window.localStorage.getItem(NAV_STYLE_STORAGE_KEY);
    if (raw === "modern" || raw === "classic") return raw;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_NAV_STYLE;
}

export function persistNavStyle(style: NavStyle): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["appNav"] = style;
  try {
    window.localStorage.setItem(NAV_STYLE_STORAGE_KEY, style);
  } catch {
    /* storage unavailable */
  }
}
