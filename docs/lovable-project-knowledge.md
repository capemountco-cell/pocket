# Pocket — project knowledge

Always-on rules. Full brief: `docs/new-project-build-prompt.md` in the repo. If a
chat message conflicts with a rule here, ask first.

## Product

Mobile-first discovery: find, collect, discuss, share interesting corners of the
web. Loop — tap one button, get a single hand-picked site full-screen, react /
save / comment / send, tap again. One card, one bottom bar; everything else a sheet
away. Not an infinite feed — the value is the edit, not the volume. Must feel like
a native iOS app; 375–390px is the target, 320px the floor.

## Brand rules (hard)

- **No reference to any other discovery, bookmarking, or read-it-later product**
  anywhere — component names, comments, routes, meta tags, titles, copy, alt text,
  README. No "successor to X" framing. Never describe Pocket as a read-it-later
  or save-for-later tool.
- Brand name lives in **one file**: `src/lib/brand.ts` (`APP_NAME`, `APP_TAGLINE`,
  `APP_DOMAIN`). Every user-facing string imports from it.
- Identifiers stay brand-neutral: CSS `--app-chrome-fg/-bg`, `--app-accent`,
  `--app-surface`, `--app-border`; storage keys `app_theme_v1`, `app_nav_style_v1`,
  `app_device_id_v1`; tables and events use domain words. The discovery action is
  `discover`/`next`. All artwork original.
- Domain vocabulary: `Site` · `Discovery` (one serve) · `Reaction`
  (like/pass/not_for_me/report) · `Collection` · `Comment` · `Event`.

## Standing policy

- **Preview-card fallback.** Many sites forbid embedding (`X-Frame-Options`, CSP
  `frame-ancestors`). Never silently reject at submit, never bypass the header.
  Detect embeddability at submission, store it on the row, render a branded preview
  card (screenshot, title, description, source domain, "Open site") — a first-class
  mode, equal in polish to embedded.
- **Respect the open web.** Honor robots.txt/noindex, identify the crawler with a
  real User-Agent + contact URL, cache to avoid hammering origins, attribute the
  source domain visibly, offer a removal path.

## Stack (locked — ask before adding anything else)

React 19 · TanStack Start (SSR) · TanStack Router (file-based) · TanStack Query ·
Vite 7 · TS strict · Tailwind v4 · shadcn/ui on Radix · `cva` · `motion` ·
`react-hook-form` + `zod` · Supabase · `sonner` · `dompurify`. `vaul` only behind
the shared sheet primitive.

`routes/` · `components/{ui,nav,icons,sheets}/` · `integrations/supabase/` ·
`lib/` · `supabase/{functions,migrations}/`.

Never hand-edit generated files (`supabase/types.ts`, `routeTree.gen.ts`). Schema
truth is `supabase/migrations/`, not the dashboard. **No secrets, keys, PINs, or
price IDs in the repo, ever** — payment price IDs live in the database.

## Engineering rules

- **Never create a duplicate component.** Search `ui/` and `components/` first;
  extend with a prop before forking. A near-identical second component is a defect.
- Systems over one-offs — solve at the primitive (sheet, icon registry, nav action
  contract), not as a bespoke lookalike.
- No half-finished states: no flag gating correctness, no TODO hiding a broken
  path, no path that only works for the happy case.
- Validate at real boundaries (user input, third-party responses, function
  payloads), not by reflex.
- Comment *why*, never *what*. Remove dead code in files you're already in.
- Narrow local state over broad context re-renders for per-frame/per-tap values.
  Lazy load routes, sheets, and heavy components off first paint. Optimistic UI and
  instant press feedback over waiting for a round trip.

## Design system

- Background `#FAFAF7`. **Hairline 1px borders, never drop shadows** — depth is
  border + tone shift. **Color means status only** (success, active, destructive,
  unread), never decoration.
- Inter, with `tabular-nums` wherever numbers sit side by side.
- **44px minimum touch targets everywhere** — pad the hit area, never shrink the
  target to fit smaller art.
- Themeable chrome via `--app-*` tokens with light-theme fallbacks, so a theme
  retints every surface without consumers branching on theme state.
- Theme ramp in **OKLCH**: accent themes share one fixed L/C ramp and vary only
  hue; within a theme's shades only lightness changes. Clamp chroma per (L, h) to
  the sRGB gamut; boosted-chroma P3 behind `@supports (color: oklch(0 0 0))`.
- Tailwind type/spacing scales; pixel-exact values computed once and exported as
  named constants.
- One button system (`ui/button.tsx` + `cva`); one input system (`input`,
  `textarea`, `select`, `form` + react-hook-form + zod).
- Fixed surfaces respect `env(safe-area-inset-*)`; bottom pad
  `max(18px, env(safe-area-inset-bottom))`, defined once.

## Motion

- Micro-interactions (press/hover springs, icon state) — Motion for React on the
  element. Structural motion (sheets, menus, route transitions, toasts) — owned by
  shared primitives, never a one-off `motion.div` in a feature component.
- Springs for gesture-driven motion; easings only for self-scheduled animation. If
  an animation's purpose can't be named in a sentence, cut it.
- **`useReducedMotion()` on every animated interaction**, with a disable or
  cross-fade branch: `animate={reduceMotion ? undefined : { scale: 0.88 }}`.
- Hold 60fps during gestures — animate `transform`/`opacity` only, never layout.
- Inline SVGs stay plain path data: no filters, masks, or heavy gradients on an
  element that also carries a CSS transform (masking under a 3D-transformed
  ancestor is a known WebKit bug).

## Sheets

**One primitive: `BaseSheet` (`ui/base-sheet.tsx`).** Feature sheets in
`components/sheets/` consume it — no feature touches `vaul` or raw Radix Dialog,
and nobody hand-rolls a fixed overlay with custom drag math.

BaseSheet owns once, for everyone: open/close spring with reduced-motion branch,
velocity-aware drag-to-dismiss, safe-area padding, a `bottomOffset` clearing the
nav, backdrop + scroll lock, focus trap and restore, `aria-modal`, labeled close,
Escape-to-close, `--app-chrome-*` theming, and size variants. Missing something?
**Add a prop** — never drop to the primitive for one screen.

## Bottom navigation

- **Exactly five slots, always.** Grid `1fr 1fr 1.65fr 1fr 1fr`, center wider for
  the brand action; tap math tuned to 320px. No sixth slot and no collapse to four
  without a full redesign pass.
- Each slot is a **user intent**, not a UI mechanism. Callers pass handlers to
  configure behavior; they never redefine what a slot means. Icon, position, and
  meaning stay stable — muscle memory is a feature. Fixed overlay `z-index: 50`;
  no route or sheet may hide it.
- `BottomNav.tsx` is a presentation switch on a device-local `app_nav_style_v1`
  preference (default `modern`): `ClassicNav` (full-width fixed bar) and
  `ModernNav` (floating dock — translucent, tinted via `color-mix()` off the same
  `--app-chrome-*` tokens, auto-hides on scroll down, returns on scroll up or tap,
  forced visible while a sheet is open). Reflect it onto
  `<html data-app-nav="modern|classic">` for CSS-only gating.
- **Never fork business logic between styles.** All slot behavior lives in
  `useNavActions.ts` once; only chrome differs. Shared `NavButton`/`BrandMark`.
- `navContentReserve(navStyle)`: Classic reserves full bar height, Modern only the
  safe area. Sheets use full bar height as `bottomOffset` in both.

## Icons

Registry at `components/icons/`. `IconName` is a closed union in `types.ts` — add
the name first so typos fail to compile, wire the asset in `registry.ts`, export a
semantic wrapper from `index.tsx`. Call sites never import a raw asset or inline an
`<img>`/`<svg>` for a UI icon. Every icon accepts `IconState`
(`idle|pressed|active|disabled|loading|success`), no-opping what it can't express.
The mascot stays one solid color on every icon and theme — color, glow, and pulse
live on a separate accent layer.

## Analytics — every meaningful interaction, or it doesn't ship

`getDeviceId()` + `recordEvent(deviceId, kind)` via a `record_event` RPC.
Fire-and-forget, anonymous, non-blocking, never throws into the UI. Event kinds are
a **TypeScript union**, not free strings. Track: every nav slot tap · reactions ·
comments · share/send-to · discovery advance and category/feed change · collection
created / item saved / removed / shared · every surfaced error · route and sheet
opens representing a real user decision.

## Backend

Every table has RLS on with explicit, minimal policies. Migration first, then
regenerate types. Tables: `sites`, `site_tags`, `discoveries`, `reactions`,
`collections`, `collection_items`, `comments`, `events`, `profiles`,
`submissions`, `reports`.

**Every edge function:** top-level try/catch; always return JSON via a shared
`json(body, status)` helper (never a bare `new Response`, never an uncaught throw);
handle `OPTIONS` and set CORS headers on **every** response path including errors;
`AbortController` timeout on every outbound fetch; `zod` validation up top;
rate-limit anything anonymously triggerable. Shared code in `_shared/`.

Auth is **email magic-link only** — no OAuth unless asked. Sessions are SSR-aware
so first paint isn't a logged-out flash.

## Definition of done

- Edge cases: empty, slow network, denied permissions, missing images, dead links.
- A11y: 44px targets at 320px · `aria-label` on icon-only controls ·
  `aria-pressed`/`aria-current` when toggled · decorative SVGs `aria-hidden` ·
  focus order matches visual order · sheets trap and restore focus · Escape
  dismisses · reduced motion honored · WCAG AA contrast **on every theme** · any
  color/glow signal paired with a non-visual cue.
- **Mobile Safari verified** — safe areas, momentum scroll, dynamic viewport,
  transform/mask. It's the primary runtime, not an afterthought.
- `--app-chrome-*` respected · analytics event present · no dead code · shared
  primitives checked against their other call sites · no third-party product name
  or brand string outside `brand.ts` · `bun run build` and `bun run lint` pass.
