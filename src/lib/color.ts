/**
 * Minimal OKLCH -> sRGB / Display-P3 math with per-(L,h) chroma gamut clamping.
 * No dependencies: everything here is plain arithmetic.
 */

type RGB = [number, number, number];

function oklchToOklab(l: number, c: number, hDeg: number): RGB {
  const h = (hDeg * Math.PI) / 180;
  return [l, Math.cos(h) * c, Math.sin(h) * c];
}

function oklabToLinearSrgb([L, a, b]: RGB): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function gammaEncode(x: number): number {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return v;
}

function inGamut([r, g, b]: RGB, eps = 0.0005): boolean {
  return [r, g, b].every((v) => v >= -eps && v <= 1 + eps);
}

/** Largest chroma at this (L, h) that still fits inside sRGB. */
export function clampChromaToSrgb(l: number, c: number, h: number): number {
  if (inGamut(oklabToLinearSrgb(oklchToOklab(l, c, h)))) return c;
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToLinearSrgb(oklchToOklab(l, mid, h)))) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** sRGB hex fallback for an OKLCH triplet (chroma is clamped first). */
export function oklchToHex(l: number, c: number, h: number): string {
  const safe = clampChromaToSrgb(l, c, h);
  const rgb = oklabToLinearSrgb(oklchToOklab(l, safe, h)).map((v) =>
    Math.round(Math.min(1, Math.max(0, gammaEncode(v))) * 255),
  );
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function oklchString(l: number, c: number, h: number): string {
  return `oklch(${l.toFixed(4)} ${c.toFixed(4)} ${h.toFixed(2)})`;
}
