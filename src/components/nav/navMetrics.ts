import type { NavStyle } from "@/lib/nav-style";

// The bar's DOM root. Named here because two things outside the nav need to
// point at it: the CSS that keeps it tappable while a modal sheet is open,
// and BaseSheet, which must not treat a tap on the bar as a tap "outside".
export const NAV_ROOT_SELECTOR = 'nav[aria-label="Primary actions"]';

// The app is designed at phone width and stays a phone-width column on bigger
// screens: the bar, the sheets and the collection all sit in this same
// centred column, so a desktop window shows one coherent app rather than
// controls flung to opposite edges of a 2000px viewport.
export const APP_CONTENT_MAX_WIDTH = 640;

export const NAV_BALANCED_PAD = "max(18px, env(safe-area-inset-bottom))";
export const NAV_HEIGHT = `calc(56px + ${NAV_BALANCED_PAD} + ${NAV_BALANCED_PAD})`;

// How much space page-level layout should reserve at the bottom for the nav
// chrome. Both styles are full-bleed bars with the same metrics today, so
// both reserve the full height; the function stays so a future style with
// different chrome only has to change this one place.
export function navContentReserve(style: NavStyle): string {
  void style;
  return NAV_HEIGHT;
}
