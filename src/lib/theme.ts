import { clampChromaToSrgb, oklchString, oklchToHex } from "./color";

export const THEME_STORAGE_KEY = "app_theme_v1";

/**
 * Every accent theme shares one fixed lightness/chroma ramp and differs only in
 * hue, so no option looks washed out next to another. Within a theme's ramp
 * only lightness changes.
 */
export const ACCENT_RAMP: { step: number; l: number }[] = [
  { step: 50, l: 0.97 },
  { step: 100, l: 0.94 },
  { step: 200, l: 0.88 },
  { step: 300, l: 0.81 },
  { step: 400, l: 0.73 },
  { step: 500, l: 0.65 },
  { step: 600, l: 0.57 },
  { step: 700, l: 0.48 },
  { step: 800, l: 0.39 },
  { step: 900, l: 0.3 },
];

/** Nominal chroma for the ramp, clamped per (L, h) before it reaches CSS. */
const BASE_CHROMA = 0.15;
/** Wider-gamut variant used when the display can render it. */
const P3_CHROMA_BOOST = 1.22;

export const THEMES = [
  { id: "ink", label: "Ink", hue: 258 },
  { id: "moss", label: "Moss", hue: 148 },
  { id: "clay", label: "Clay", hue: 42 },
  { id: "ember", label: "Ember", hue: 24 },
  { id: "tide", label: "Tide", hue: 214 },
  { id: "plum", label: "Plum", hue: 322 },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "ink";

export function themeHue(id: ThemeId): number {
  return THEMES.find((t) => t.id === id)?.hue ?? 258;
}

export type AccentVars = Record<string, string>;

/** sRGB-safe custom properties (hex fallbacks + clamped oklch). */
export function accentVars(id: ThemeId, wideGamut = false): AccentVars {
  const hue = themeHue(id);
  const vars: AccentVars = {};
  for (const { step, l } of ACCENT_RAMP) {
    const nominal = wideGamut ? BASE_CHROMA * P3_CHROMA_BOOST : BASE_CHROMA;
    const c = clampChromaToSrgb(l, wideGamut ? nominal : nominal, hue);
    vars[`--app-accent-${step}`] = wideGamut
      ? oklchString(l, nominal, hue)
      : oklchToHex(l, c, hue);
  }
  vars["--app-accent"] = vars["--app-accent-600"]!;
  vars["--app-accent-contrast"] = "#ffffff";
  return vars;
}

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw && THEMES.some((t) => t.id === raw)) return raw as ThemeId;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_THEME;
}

export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const wide =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(color-gamut: p3)").matches;

  for (const [key, value] of Object.entries(accentVars(id, false))) {
    root.style.setProperty(key, value);
  }
  if (wide) {
    for (const [key, value] of Object.entries(accentVars(id, true))) {
      root.style.setProperty(key, value);
    }
  }
  root.dataset["appTheme"] = id;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* storage unavailable */
  }
}
