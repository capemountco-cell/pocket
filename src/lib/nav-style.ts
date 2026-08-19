import { useEffect, useState } from "react";

// Navigation presentation the user has picked for the bottom nav: "modern"
// "modern" (default) or "classic" — two presentations of the same five-slot bar.
// Device-local, not profile-synced, so switching styles works the same
// whether or not the user is signed in.
export type NavStyle = "modern" | "classic";

export const DEFAULT_NAV_STYLE: NavStyle = "modern";
const STORAGE_KEY = "app_nav_style_v1";

let currentStyle: NavStyle = DEFAULT_NAV_STYLE;
type Listener = (style: NavStyle) => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn(currentStyle);
    } catch {
      /* ignore */
    }
  });
}

// Reflected onto <html> as data-app-nav so CSS-only concerns (the adaptive
// top-chrome blend in styles.css) can gate themselves on nav style without
// every consumer needing to read React state.
function applyNavStyleAttr(style: NavStyle): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-app-nav", style);
}

export function getNavStyle(): NavStyle {
  return currentStyle;
}

export function loadLocalNavStyle(): NavStyle {
  if (typeof localStorage === "undefined") return DEFAULT_NAV_STYLE;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "classic" ? "classic" : DEFAULT_NAV_STYLE;
  } catch {
    return DEFAULT_NAV_STYLE;
  }
}

export function setNavStyle(next: NavStyle): void {
  currentStyle = next;
  applyNavStyleAttr(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  notify();
}

export function initNavStyle(): void {
  currentStyle = loadLocalNavStyle();
  applyNavStyleAttr(currentStyle);
  notify();
}

export function subscribeNavStyle(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useNavStyle(): NavStyle {
  const [style, setStyle] = useState<NavStyle>(() => getNavStyle());
  useEffect(() => subscribeNavStyle(setStyle), []);
  return style;
}
