/* =====================================================================
 * OKLCH theme engine.
 *
 * - Every accent theme shares a single fixed (L, C) ramp; only the hue
 *   changes between themes, so all options feel equally vivid.
 * - Within a theme's shade ramp only lightness changes (hue + chroma stay
 *   constant) so shades don't drift toward purple at light end or muddy
 *   gray at dark end.
 * - Chroma is clamped per (L, h) to the in-gamut maximum for sRGB so
 *   nothing clips. P3 screens get a boosted-chroma `oklch()` exposed via
 *   the `--app-grad-*` and other tokens; sRGB hex fallbacks live in
 *   styles.css behind `@supports (color: oklch(0 0 0))`.
 * ===================================================================== */

export type ThemeKey =
  | "white"
  | "silver"
  | "lime"
  | "yellow"
  | "orange"
  | "red"
  | "pink"
  | "purple"
  | "blue"
  | "space-gray"
  | "black"
  | "custom"
  | "adaptive";

export type ThemeDef = {
  key: ThemeKey;
  label: string;
  base: string; // picker swatch hex (sRGB)
  isDark: boolean;
  hue: number | null; // OKLCH hue in degrees; null = neutral
};

export const THEMES: ThemeDef[] = [
  { key: "white", label: "White", base: "#F6F6F4", isDark: false, hue: null },
  { key: "silver", label: "Silver", base: "#D8D9D8", isDark: false, hue: null },
  { key: "lime", label: "Lime Green", base: "#A5B43A", isDark: false, hue: 130 },
  { key: "yellow", label: "Yellow", base: "#D9B21C", isDark: false, hue: 95 },
  { key: "orange", label: "Orange", base: "#E58C17", isDark: false, hue: 60 },
  { key: "red", label: "Red", base: "#EE2E45", isDark: false, hue: 25 },
  { key: "pink", label: "Pink", base: "#E73E9E", isDark: false, hue: 350 },
  { key: "purple", label: "Purple", base: "#6A43D6", isDark: false, hue: 300 },
  { key: "blue", label: "Blue", base: "#00A2E8", isDark: false, hue: 235 },
  { key: "space-gray", label: "Space Gray", base: "#5A5D63", isDark: true, hue: null },
  { key: "black", label: "Black", base: "#0A0A0A", isDark: true, hue: null },
];

export const DEFAULT_THEME: ThemeKey = "white";

// THEMES is a non-empty literal, but indexed access is checked, so the
// fallback is named once rather than asserted at each use.
const DEFAULT_THEME_DEF: ThemeDef = {
  key: "white",
  label: "White",
  base: "#F6F6F4",
  isDark: false,
  hue: null,
};
const STORAGE_KEY = "app_theme_v1";
const CUSTOM_KEY = "app_theme_custom_v1";

// Fixed OKLCH ramp shared by every accent theme.
export const RAMP = {
  light: {
    bgL: 0.955,
    bgC: 0.022,
    fgL: 0.32,
    fgC: 0.085,
    mutedL: 0.55,
    mutedC: 0.05,
    borderL: 0.88,
    borderC: 0.02,
    avatarL: 0.91,
    avatarC: 0.025,
  },
  dark: {
    bgL: 0.22,
    bgC: 0.022,
    fgL: 0.94,
    fgC: 0.04,
    mutedL: 0.7,
    mutedC: 0.03,
    borderL: 0.32,
    borderC: 0.02,
    avatarL: 0.28,
    avatarC: 0.025,
  },
  p3Boost: 1.45,
};

export type CustomTheme = {
  hue: number; // 0..360
  chroma: number; // 0..0.37 (clamped to gamut)
  lightness: number; // 0..1
  angle: number; // gradient angle (deg)
  p3: boolean;
  isDark: boolean;
};

type Tokens = {
  bg: string;
  fg: string;
  fgMuted: string;
  border: string;
  accent: string;
  avatar: string;
  gradStopA: string;
  gradStopB: string;
  angle: number;
};

/* ---------------- OKLCH math ---------------- */
function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_,
    m = m_ * m_ * m_,
    s = s_ * s_ * s_;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
function linearToSrgb(v: number): number {
  if (v <= 0.0031308) return 12.92 * v;
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}
function oklchToRgb(
  L: number,
  C: number,
  h: number,
): { r: number; g: number; b: number; inGamut: boolean } {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr),
    b = C * Math.sin(hr);
  const [lr, lg, lb] = oklabToLinearSrgb(L, a, b);
  const R = linearToSrgb(lr),
    G = linearToSrgb(lg),
    B = linearToSrgb(lb);
  const inGamut =
    R >= -0.001 && R <= 1.001 && G >= -0.001 && G <= 1.001 && B >= -0.001 && B <= 1.001;
  return {
    r: Math.max(0, Math.min(1, R)),
    g: Math.max(0, Math.min(1, G)),
    b: Math.max(0, Math.min(1, B)),
    inGamut,
  };
}
export function maxChromaSrgb(L: number, h: number): number {
  let lo = 0,
    hi = 0.4;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (oklchToRgb(L, mid, h).inGamut) lo = mid;
    else hi = mid;
  }
  return lo;
}
function clampChroma(L: number, C: number, h: number): number {
  return Math.min(C, maxChromaSrgb(L, h));
}
function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => {
    const x = Math.max(0, Math.min(255, Math.round(v * 255))).toString(16);
    return x.length === 1 ? "0" + x : x;
  };
  return "#" + to(r) + to(g) + to(b);
}
function oklchHex(L: number, C: number, h: number): string {
  const rgb = oklchToRgb(L, clampChroma(L, C, h), h);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}
function oklchStr(L: number, C: number, h: number): string {
  const Cc = clampChroma(L, C, h);
  return "oklch(" + L.toFixed(4) + " " + Cc.toFixed(4) + " " + h.toFixed(2) + ")";
}
function oklchStrP3(L: number, C: number, h: number): string {
  const target = Math.min(C * RAMP.p3Boost, 0.37);
  return "oklch(" + L.toFixed(4) + " " + target.toFixed(4) + " " + h.toFixed(2) + ")";
}

// sRGB hex/0-255 -> OKLCH (hue only, used for adaptive sampling).
function srgbToOklch(r: number, g: number, b: number): { L: number; C: number; h: number } {
  const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const R = toLin(r),
    G = toLin(g),
    B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(a * a + b2 * b2);
  let hh = (Math.atan2(b2, a) * 180) / Math.PI;
  if (hh < 0) hh += 360;
  return { L, C, h: hh };
}

/* ---------------- WCAG nudge ---------------- */
function relLuminance(L: number, C: number, h: number): number {
  const { r, g, b } = oklchToRgb(L, clampChroma(L, C, h), h);
  const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}
function contrast(l1: number, l2: number): number {
  const a = Math.max(l1, l2),
    b = Math.min(l1, l2);
  return (a + 0.05) / (b + 0.05);
}
function nudgeForContrast(
  bgL: number,
  bgC: number,
  fgL: number,
  fgC: number,
  h: number,
  isDark: boolean,
): number {
  const bgLum = relLuminance(bgL, bgC, h);
  let L = fgL;
  for (let i = 0; i < 40; i++) {
    if (contrast(relLuminance(L, fgC, h), bgLum) >= 4.5) return L;
    L = isDark ? Math.min(0.99, L + 0.02) : Math.max(0.04, L - 0.02);
  }
  return L;
}

/* ---------------- Derivation ---------------- */
function deriveFromHue(hue: number, isDark: boolean): Tokens {
  const r = isDark ? RAMP.dark : RAMP.light;
  const fgL = nudgeForContrast(r.bgL, r.bgC, r.fgL, r.fgC, hue, isDark);
  const stopA = oklchStr(r.bgL, r.bgC, hue);
  const stopB = oklchStr(
    isDark ? Math.min(0.4, r.bgL + 0.08) : Math.max(0.85, r.bgL - 0.05),
    r.bgC + 0.01,
    (hue + 30) % 360,
  );
  return {
    bg: oklchHex(r.bgL, r.bgC, hue),
    fg: oklchHex(fgL, r.fgC, hue),
    fgMuted: oklchHex(r.mutedL, r.mutedC, hue),
    border: oklchHex(r.borderL, r.borderC, hue),
    accent: oklchHex(fgL, r.fgC, hue),
    avatar: oklchHex(r.avatarL, r.avatarC, hue),
    gradStopA: stopA,
    gradStopB: stopB,
    angle: 135,
  };
}
function deriveNeutral(isDark: boolean): Tokens {
  const r = isDark ? RAMP.dark : RAMP.light;
  return {
    bg: oklchHex(r.bgL, 0, 0),
    fg: oklchHex(r.fgL, 0, 0),
    fgMuted: oklchHex(r.mutedL, 0, 0),
    border: oklchHex(r.borderL, 0, 0),
    accent: oklchHex(r.fgL, 0, 0),
    avatar: oklchHex(r.avatarL, 0, 0),
    gradStopA: oklchStr(r.bgL, 0, 0),
    gradStopB: oklchStr(isDark ? r.bgL + 0.06 : r.bgL - 0.03, 0, 0),
    angle: 135,
  };
}
function deriveCustom(c: CustomTheme): Tokens {
  const bgL = Math.max(0.08, Math.min(0.98, c.lightness));
  const bgC = Math.min(c.chroma, maxChromaSrgb(bgL, c.hue));
  const fgC = Math.min(c.chroma * 1.2, 0.18);
  const fgL = nudgeForContrast(bgL, bgC, c.isDark ? 0.94 : 0.32, fgC, c.hue, c.isDark);
  return {
    bg: oklchHex(bgL, bgC, c.hue),
    fg: oklchHex(fgL, fgC, c.hue),
    fgMuted: oklchHex(c.isDark ? 0.7 : 0.55, Math.min(bgC * 0.8, 0.05), c.hue),
    border: oklchHex(c.isDark ? 0.32 : 0.88, Math.min(bgC * 0.6, 0.03), c.hue),
    accent: oklchHex(fgL, fgC, c.hue),
    avatar: oklchHex(c.isDark ? 0.28 : 0.91, Math.min(bgC * 0.7, 0.04), c.hue),
    gradStopA: c.p3 ? oklchStrP3(bgL, bgC, c.hue) : oklchStr(bgL, bgC, c.hue),
    gradStopB: c.p3
      ? oklchStrP3(
          c.isDark ? bgL + 0.08 : Math.max(0.85, bgL - 0.05),
          Math.min(bgC + 0.015, 0.37),
          (c.hue + 30) % 360,
        )
      : oklchStr(
          c.isDark ? bgL + 0.08 : Math.max(0.85, bgL - 0.05),
          Math.min(bgC + 0.015, 0.37),
          (c.hue + 30) % 360,
        ),
    angle: c.angle,
  };
}

function deriveTokens(theme: ThemeDef): Tokens {
  if (theme.key === "white" || theme.key === "silver") return deriveNeutral(false);
  if (theme.key === "black" || theme.key === "space-gray") return deriveNeutral(true);
  if (theme.key === "adaptive") return deriveFromHue(adaptiveHue ?? 235, false);
  if (theme.key === "custom") return deriveCustom(loadCustom());
  if (theme.hue === null) return deriveNeutral(theme.isDark);
  return deriveFromHue(theme.hue, theme.isDark);
}

export function tokensFor(theme: ThemeDef): Tokens {
  return deriveTokens(theme);
}

export function findTheme(key: string | null | undefined): ThemeDef {
  const k = (key || "").toLowerCase();
  const hit = THEMES.find((t) => t.key === k);
  if (hit) return hit;
  if (k === "custom")
    return { key: "custom", label: "Custom", base: "#F6F6F4", isDark: false, hue: null };
  if (k === "adaptive")
    return { key: "adaptive", label: "Adaptive", base: "#F6F6F4", isDark: false, hue: null };
  return DEFAULT_THEME_DEF;
}

/* ---------------- Subscribers ---------------- */
let currentKey: ThemeKey = DEFAULT_THEME;
type Listener = (k: ThemeKey) => void;
const listeners = new Set<Listener>();

export function getCurrentTheme(): ThemeKey {
  return currentKey;
}
export function subscribeTheme(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function notify() {
  listeners.forEach((fn) => {
    try {
      fn(currentKey);
    } catch {
      /* ignore */
    }
  });
}

/* ---------------- Custom theme persistence ---------------- */
// Defaults are tuned so the Manual tab opens showing real color, not near-gray.
// Chroma is clamped to the sRGB gamut at the chosen L/h, and the achievable
// chroma collapses toward zero as lightness approaches white: at L=0.955 the
// max for this hue is only ~0.026, so any chroma reads as a pale wash. A
// mid-light lightness (0.85) leaves headroom (~0.088 max here) so the default
// chroma of 0.12 lands as a visible tint after clamping.
const DEFAULT_CUSTOM: CustomTheme = {
  hue: 235,
  chroma: 0.12,
  lightness: 0.85,
  angle: 135,
  p3: true,
  isDark: false,
};
let cachedCustom: CustomTheme | null = null;
export function loadCustom(): CustomTheme {
  if (cachedCustom) return cachedCustom;
  let out: CustomTheme;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(CUSTOM_KEY) : null;
    out = raw ? { ...DEFAULT_CUSTOM, ...JSON.parse(raw) } : { ...DEFAULT_CUSTOM };
  } catch {
    out = { ...DEFAULT_CUSTOM };
  }
  cachedCustom = out;
  return out;
}
export function saveCustom(c: CustomTheme): void {
  cachedCustom = { ...c };
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(cachedCustom));
  } catch {
    /* ignore */
  }
  if (currentKey === "custom") applyTheme("custom");
}

/* ---------------- Adaptive (per-site) ---------------- */
let adaptiveHue: number | null = null;
let adaptiveSourceUrl: string | null = null;

// Top chrome around the embedded site (see .app-viewer-outer /
// .app-viewer-frame in styles.css) is solid black on every theme. This
// module only keeps the browser's theme-color meta in sync with it while a
// site is active; the favicon/og:image sample below now feeds the "adaptive"
// ThemeKey's hue exclusively.
const VIEWER_CHROME_HEX = "#000000";
let topChromeColor: { hex: string } | null = null;

/**
 * The colour of the app's own chrome, which is not the colour of its content.
 *
 * These were the same variable and they are not the same thing. `--app-bg` is
 * the content background -- near-white on the default theme -- while
 * `--app-chrome-bg` is the bar, the sheets and every full-screen surface, and
 * is solid black there. The meta tag was being set from the first, so the
 * moment the theme initialised it repainted iOS's status bar and toolbar in
 * near-white and left a white strip above and below a black app.
 *
 * It only showed on screens with no site. The discovery loop pins the meta to
 * black as soon as one loads, which is why History and Explore were the two
 * that looked broken.
 *
 * Mirrors the rule in styles.css exactly: chrome is black on the white theme,
 * and follows --app-bg on every coloured one.
 */
let lastChromeBg = "#000000";

function chromeBgFor(key: ThemeKey, bg: string): string {
  return key === "white" ? "#000000" : bg;
}

function updateThemeColorMeta(hex: string): void {
  if (typeof document === "undefined") return;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", hex);
}

// Pushes (or clears) the viewer-chrome color. Keeps the browser's
// `theme-color` meta in sync so the mobile status/URL bar matches the black
// on-screen strip while a site is embedded, and falls back to the app theme
// background whenever no site is active.
function applyTopChromeColor(c: { hex: string } | null): void {
  topChromeColor = c;
  if (typeof document === "undefined") return;
  updateThemeColorMeta(c ? c.hex : lastChromeBg);
}

export function setAdaptiveSource(url: string | null | undefined): void {
  const u = (url || "").trim() || null;
  if (u === adaptiveSourceUrl) return;
  adaptiveSourceUrl = u;
  if (!u) {
    adaptiveHue = null;
    applyTopChromeColor(null);
    if (currentKey === "adaptive") applyTheme("adaptive");
    return;
  }
  // The strip above the site is always black now, so the meta can be pinned
  // immediately; the async sample below only feeds the adaptive theme hue.
  applyTopChromeColor({ hex: VIEWER_CHROME_HEX });
  void sampleSiteColor(u).then((c) => {
    if (adaptiveSourceUrl !== u) return;
    if (c) adaptiveHue = c.h;
    if (currentKey === "adaptive") applyTheme("adaptive");
  });
}

async function sampleSiteColor(url: string): Promise<{ hex: string; h: number } | null> {
  if (typeof document === "undefined") return null;
  try {
    // No image proxy exists yet, so cross-origin sampling can taint the canvas
    // and throw — sampleSiteColor already returns null on failure, which leaves
    // the adaptive theme on its previous hue. Route through the proxy once the
    // submission pipeline ships it.
    const src = url;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 4000);
      img.src = src;
    });
    if (!loaded) return null;
    const w = 32,
      h = 32;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch {
      return null;
    }
    // Same 12-way hue bucketing as the adaptive-theme hue derivation below,
    // but each bucket also accumulates a chroma-weighted rgb sum so we can
    // recover the actual dominant color (not just its hue) for the chrome
    // strip, which needs a literal color match rather than a themed tint.
    type HueBucket = { count: number; hueSum: number; rSum: number; gSum: number; bSum: number };
    const buckets: HueBucket[] = Array.from({ length: 12 }, () => ({
      count: 0,
      hueSum: 0,
      rSum: 0,
      gSum: 0,
      bSum: 0,
    }));
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] ?? 0;
      if (a < 100) continue;
      const r = (data[i] ?? 0) / 255,
        g = (data[i + 1] ?? 0) / 255,
        b = (data[i + 2] ?? 0) / 255;
      const { C, h: hh } = srgbToOklch(r, g, b);
      if (C < 0.04) continue;
      const bucket = buckets[Math.floor(hh / 30) % 12];
      if (!bucket) continue;
      bucket.count += C;
      bucket.hueSum += hh * C;
      bucket.rSum += r * C;
      bucket.gSum += g * C;
      bucket.bSum += b * C;
    }
    let bk: HueBucket | null = null;
    for (const bucket of buckets) {
      if (!bk || bucket.count > bk.count) bk = bucket;
    }
    if (!bk || bk.count === 0) return null;
    const rAvg = bk.rSum / bk.count,
      gAvg = bk.gSum / bk.count,
      bAvg = bk.bSum / bk.count;
    return { h: bk.hueSum / bk.count, hex: rgbToHex(rAvg, gAvg, bAvg) };
  } catch {
    return null;
  }
}

/* ---------------- Apply / persist ---------------- */
export function applyTheme(key: ThemeKey): void {
  if (typeof document === "undefined") return;
  const theme = findTheme(key);
  const tk = tokensFor(theme);
  const root = document.documentElement;
  root.setAttribute("data-app-theme", theme.key);
  root.style.setProperty("--app-bg", tk.bg);
  root.style.setProperty("--app-fg", tk.fg);
  root.style.setProperty("--app-fg-muted", tk.fgMuted);
  root.style.setProperty("--app-border", tk.border);
  root.style.setProperty("--app-accent", tk.accent);
  root.style.setProperty("--app-avatar-bg", tk.avatar);
  // Gradient stops (oklch); consumers interpolate via `linear-gradient(in oklab, ...)`.
  root.style.setProperty("--app-grad-a", tk.gradStopA);
  root.style.setProperty("--app-grad-b", tk.gradStopB);
  root.style.setProperty("--app-grad-angle", tk.angle + "deg");
  currentKey = theme.key;
  lastChromeBg = chromeBgFor(theme.key, tk.bg);
  // Only the fallback path owns the meta tag here — a live site color (set by
  // applyTopChromeColor) takes precedence over the static app theme.
  if (!topChromeColor) updateThemeColorMeta(lastChromeBg);
  notify();
}

export function setTheme(key: ThemeKey): void {
  applyTheme(key);
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* ignore */
  }
}

export function loadLocalTheme(): ThemeKey {
  if (typeof localStorage === "undefined") return DEFAULT_THEME;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) return DEFAULT_THEME;
    return findTheme(v).key;
  } catch {
    return DEFAULT_THEME;
  }
}

export function initTheme(): void {
  applyTheme(loadLocalTheme());
}
