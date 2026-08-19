import type { NavStyle } from "@/lib/nav-style";

// The bar's DOM root. Named here because two things outside the nav need to
// point at it: the CSS that keeps it tappable while a modal sheet is open,
// and BaseSheet, which must not treat a tap on the bar as a tap "outside".
export const NAV_ROOT_SELECTOR = 'nav[aria-label="Primary actions"]';

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
