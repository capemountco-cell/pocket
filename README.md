# Pocket

Build a mobile-first web app called **Pocket** — a premium discovery product for finding, collecting, discussing, and sharing interesting corners of the web.

The core loop: a user opens the app, taps one big button, and gets a single hand-picked site rendered full-screen. They react to it, save it to a collection, comment on it, or send it to a friend — then tap again for the next one. That's it. One card, one bottom bar, everything else is a sheet away. It is NOT an infinite feed — one card at a time, a deliberate tap to advance.

It must feel like a native iOS app, not a website: 375–390px viewport is the primary design target (320px is the floor), spring-based press feedback, safe-area-aware chrome, no layout jumps, no browser affordances leaking through (visible scrollbars, tap-highlight flashes, overscroll bounce in the wrong place, focus rings on touch).

Stack: React 19 + TanStack Start (SSR) + TanStack Router (file-based) + TanStack Query, Vite 7, TypeScript strict, Tailwind v4, shadcn/ui on Radix, Motion for React for animation, Supabase for Postgres/Auth/Storage/Edge Functions. Bun as package manager.

IMPORTANT — brand neutrality. The name "Pocket" must appear ONLY in user-facing copy and in one constant file, `src/lib/brand.ts`, which exports APP_NAME, APP_TAGLINE, APP_DOMAIN. Every user-facing string imports from there. Never put the brand name in code identifiers, CSS custom properties, storage keys, table names, or analytics event names — those use brand-neutral vocabulary: CSS `--app-chrome-fg`, `--app-chrome-bg`, `--app-accent`, `--app-surface`, `--app-border`; storage keys `app_theme_v1`, `app_nav_style_v1`, `app_device_id_v1`; the discovery action is `discover`/`next`. Do not reference, name, or imitate any other discovery, bookmarking, or read-it-later product anywhere — not in component names, comments, routes, meta tags, page titles, copy, or the README. Never describe Pocket as a read-it-later or save-for-later tool. All artwork must be original.

**Start with Milestone 1 only. Do not build the backend yet.** Milestone 1 is:

1. App shell — `__root.tsx`, file-based routes, and the discovery screen at `/`.
2. `src/lib/brand.ts` and `src/lib/device-id.ts` (anonymous device id persisted in localStorage).
3. The theme token layer: an OKLCH-based theme engine where every accent theme shares one fixed lightness/chroma ramp and varies only hue, so all options feel equally vivid; within a theme's shade ramp only lightness changes. Clamp chroma per (L, h) to the sRGB gamut and expose a boosted-chroma P3 variant behind `@supports (color: oklch(0 0 0))` with sRGB hex fallbacks. Ship the `--app-*` chrome tokens with hardcoded light-theme fallbacks. App background `#FAFAF7`. Hairline 1px borders, never drop shadows — depth comes from a border and a tone shift. Color is reserved for status meaning only, never decoration.
4. The bottom navigation. Exactly five slots — grid `1fr 1fr 1.65fr 1fr 1fr` with the center slot wider for the brand action. `BottomNav.tsx` is a thin presentation switch reading a device-local `app_nav_style_v1` preference (default `modern`) and rendering either `ClassicNav.tsx` (full-width fixed bar) or `ModernNav.tsx` (compact floating dock: translucent/blurred, tinted via `color-mix()` off the same `--app-chrome-*` tokens so it re-themes automatically, auto-hides on scroll down, reappears on scroll up or tap). Both consume the SAME `useNavActions.ts` hook for every slot's behavior and the same `NavButton.tsx` / `BrandMark.tsx` primitives — never fork business logic between the two styles, only chrome differs. Export `navContentReserve(navStyle)` for page layout: Classic reserves full bar height, Modern reserves only the safe area. Reflect the style onto `<html data-app-nav="modern|classic">`. Fixed overlay at `z-index: 50`. 44px minimum touch targets, verified at 320px width. Respect `env(safe-area-inset-*)` with a bottom pad of `max(18px, env(safe-area-inset-bottom))` defined once as a constant.
5. A discovery card fed by a local seed array of ~12 real, interesting sites. Placeholder presentation is fine for now — Milestone 8 adds the real submission and embeddability pipeline.

Accessibility is part of done, not a follow-up: `aria-label` on every icon-only control, focus order matching visual order, and `useReducedMotion()` honored on every animated interaction with a branch that disables or cross-fades it.

Ask me before adding any dependency beyond the stack listed above. When Milestone 1 builds clean, stop and tell me what you built — I'll direct the next milestone.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pockettt.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/22e0a8b9-c50f-43bf-9d34-6c84f78013c5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
