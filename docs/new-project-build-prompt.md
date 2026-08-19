# Master build prompt — new discovery product (clean-room rebuild)

This document is the single artifact you hand to a build agent (Lovable, ChatGPT,
Claude, Cursor) to stand up the product from an empty repo. It merges the product
mission, architecture, design system, motion system, accessibility, performance,
and analytics contracts into one brief.

> **Status.** Milestones 1 and 2 shipped. The design system in §6/§7/§9 is no
> longer a description to build from — it was ported from the predecessor
> codebase and now lives in `src/styles.css`, `src/lib/theme.ts`, and
> `src/components/nav/`. The sheet system in §8 is likewise built:
> `src/components/ui/base-sheet.tsx` plus the feature sheets in
> `src/components/sheets/`. Read the code first; this document explains the
> intent behind it.
>
> Everything the sheets record — reactions, saved sites, hidden sites,
> submissions — is device-local (`src/lib/site-prefs.ts`) until Milestone 4
> stands the backend up. There is no Supabase project, no `supabase/`
> directory, and no auth yet; rows that need one say so on the row.

**How to use it**

- **Lovable** — paste §0 (Kickoff) as the project's first message, then save the
  condensed digest (`docs/lovable-project-knowledge.md`) as the project's
  Knowledge so every later message inherits the non-negotiables. Lovable caps
  Knowledge at 10,000 characters, which is why the digest exists; paste the
  relevant full section from this document into a message when a milestone needs
  the detail.
- **ChatGPT / Claude / Cursor** — paste the whole document as the system/first
  message, then work milestone by milestone from §13.

**The product is called `Pocket`.** The name appears **only in user-facing copy
and one constant file** — never in code identifiers, CSS tokens, storage keys,
table names, or event names — so a rename stays a one-line change (§1).

**Trademark note.** `Pocket` was Mozilla's read-it-later product (getpocket.com,
discontinued 2025). The trademark did not lapse with the product. Since this
build exists partly to escape a brand-similarity takedown, treat the name as
carrying real risk: never describe Pocket as a read-it-later or save-for-later
tool, never use a bookmark/pocket-shaped mark or Mozilla-adjacent styling, and
run a trademark search before buying a domain or launching publicly. The
one-file naming rule above is what keeps a later rename cheap.

---

## 0. Kickoff (paste this as message one)

> Build a mobile-first web app called **Pocket** — a premium discovery product for
> finding, collecting, discussing, and sharing interesting corners of the web.
>
> The core loop: a user opens the app, taps one big button, and gets a single
> hand-picked site rendered full-screen. They react to it, save it to a
> collection, comment on it, or send it to a friend — then tap again for the
> next one. That's it. One card, one bottom bar, everything else is a sheet away.
>
> It must feel like a native iOS app, not a website: 375–390px viewport is the
> primary design target (320px is the floor), spring-based press feedback,
> safe-area-aware chrome, no layout jumps, no browser affordances leaking
> through.
>
> Stack: React 19 + TanStack Start (SSR) + TanStack Router + TanStack Query,
> Vite 7, TypeScript, Tailwind v4, shadcn/ui on Radix, Motion for React for
> animation, Supabase for Postgres/Auth/Storage/Edge Functions.
>
> Start with Milestone 1 only (§13): the shell, the theme token layer, the
> bottom navigation with its five slots, and a stubbed discovery card fed by
> seed data. Do not build the backend yet. Ask me before adding any dependency
> not listed in §3.

---

## 1. Naming, brand independence, and namespacing

This is a **clean-room build**. It is not a clone of, successor to, or homage to
any existing product, and nothing in the codebase, copy, metadata, or repository
may suggest otherwise.

**Hard rules:**

1. **No reference to any prior or third-party discovery brand** anywhere — not in
   component names, comments, commit messages, route paths, meta tags, page
   titles, marketing copy, alt text, or the README. If a name would only make
   sense to someone who knows a predecessor product, it is the wrong name.
2. **Never use a trademarked product name** in the brand, domain, tagline, or
   SEO copy, including as "the new X" or "X alternative" framing.
3. **The brand name lives in exactly one file:** `src/lib/brand.ts`, exporting
   `APP_NAME`, `APP_TAGLINE`, `APP_DOMAIN`. Every user-facing string imports from
   there. Renaming the product is then a one-line diff.
4. **Code identifiers are brand-neutral by construction:**
   - CSS custom properties: `--app-chrome-fg`, `--app-chrome-bg`, `--app-accent`,
     `--app-surface`, `--app-border` — never a brand prefix.
   - `localStorage` keys: `app_theme_v1`, `app_nav_style_v1`, `app_device_id_v1`.
   - Database tables/columns and analytics event names use **domain** words:
     `sites`, `discoveries`, `reactions`, `collections`, `collection_items`,
     `comments`, `events`. Not brand words.
   - The discovery action is called **`discover`** / **`next`** in code. Avoid any
     verb borrowed from another product.
5. **The mascot and all artwork must be original.** No character, silhouette,
   color treatment, or wordmark derived from an existing product's assets.

**Naming the domain concepts** (use these consistently everywhere):

| Concept | Name in code | Notes |
| --- | --- | --- |
| A destination the app can show | `Site` | url, title, description, image, tags, category |
| One serve of a site to a user | `Discovery` | the unit the feed algorithm returns |
| A user's judgment on a site | `Reaction` | `like` / `pass` / `not_for_me` / `report` |
| A saved grouping | `Collection` | user-owned, optionally shareable |
| Threaded discussion on a site | `Comment` | |
| Anonymous analytics row | `Event` | device-scoped, no account required |

---

## 2. Mission and what makes this different

**Mission:** be the layer people reach for when they want the internet to show
them something, instead of searching for something they already named. Optimize
for *discovering, collecting, discussing, and sharing* — in that order of
priority, but all four are first-class, not a random button with features bolted
on.

This is a long-lived product, not a prototype. When speed and long-term quality
trade off, quality wins. If a shortcut is taken anyway, say so explicitly in the
response and state what the real fix looks like — never leave it silent in code.

**Deliberate differentiators (build these in from the start, they are not v2):**

1. **Collections are the spine, not a bookmark list.** Saving asks *where*, with a
   one-tap default and an inline "new collection" affordance. A collection has a
   cover, a description, and a public share URL that renders server-side as a
   real, crawlable page.
2. **Discussion attaches to the site, not to a post.** Every site has one durable
   comment thread visible to everyone who ever gets served that site. This is what
   turns a feed into a place.
3. **Trails.** A user can turn a sequence of discoveries into an ordered,
   shareable trail ("7 sites about brutalist architecture"). A trail is a
   Collection with `ordered = true` and a guided reader mode.
4. **Preview-card fallback instead of rejection.** Many sites forbid embedding
   (`X-Frame-Options`, CSP `frame-ancestors`). Never silently reject those at
   submit time and never try to bypass the header. Detect embeddability at
   submission, store it on the row, and render a **branded preview card** —
   screenshot, title, description, source domain, and a prominent "Open site"
   action — for anything not embeddable. This is a first-class presentation mode,
   equal in polish to the embedded one.
5. **Intent, not infinite scroll.** No endless feed. One card at a time, a
   deliberate tap to advance. The product's value is the *edit*, not the volume.

**Respect the open web.** Honor `robots.txt` and `noindex` when crawling metadata,
identify the crawler with a real User-Agent and contact URL, cache aggressively to
avoid hammering origins, attribute every site to its source domain visibly, and
give site owners a working removal path. Screenshot and metadata capture happen
server-side with a timeout and a rate limit.

---

## 3. Stack and constraints

**Locked stack** (do not substitute; ask before adding anything else):

- React 19, TanStack Start (full-stack SSR), TanStack Router (file-based),
  TanStack Query
- Vite 7, TypeScript (strict), Bun as package manager
- Tailwind v4, shadcn/ui (Radix primitives), `class-variance-authority`,
  `tailwind-merge`
- `motion` (Motion for React) for animation; `vaul` **only** behind the shared
  sheet primitive (§8)
- `react-hook-form` + `@hookform/resolvers` + `zod` for every form
- Supabase: Postgres, Auth, Storage, Edge Functions (Deno), pg_cron, Realtime
- `sonner` for toasts, `date-fns` for time formatting, `dompurify` for any
  user-authored HTML

**Scripts:** `bun run dev` / `build` / `build:dev` / `preview` / `lint` / `format`.

**Repository layout:**

```
src/routes/            file-based routes; __root.tsx is the shell
src/components/        feature components
src/components/ui/     shadcn/ui primitives — the only place to add a primitive
src/components/nav/    bottom navigation shells + shared button primitives
src/components/icons/  the icon system (§6)
src/components/sheets/ feature sheets, all built on BaseSheet (§8)
src/integrations/supabase/  client, SSR client, generated DB types, auth middleware
src/lib/               API wrappers (*-api.ts), theme, device id, analytics, helpers
supabase/functions/    Deno edge functions; shared code in _shared/
supabase/migrations/   SQL migrations — the only source of truth for schema
```

**Generated files are never hand-edited:** `src/integrations/supabase/types.ts`
(generated from the database) and `src/routes/routeTree.gen.ts` (generated by the
router plugin). The schema's source of truth is `supabase/migrations/`, not the
Supabase dashboard and not the types file.

**Secrets:** no API keys, PINs, price IDs, or tokens in the repo — ever, including
in comments, tests, or seed files. Payment provider price IDs live in the
database, not in environment variables. The admin route is PIN-gated and the PIN
never appears in source.

---

## 4. Engineering philosophy

Hold two roles on every task.

**Staff engineer.** Think about the system the change lives in. Before writing new
code, ask what in this codebase already solves part of this. Ask what the next two
features touching this area will need — without over-building for hypotheticals.

**Senior product designer.** No change is "just backend" or "just wiring." If a
user can feel it, its UX is your responsibility even when nobody asked for a
design pass.

In practice:

- **Systems over one-offs.** A new sheet, a new icon state, a new bottom-bar
  action — solve it at the level of the primitive (the sheet, the icon registry,
  the action contract), not as a bespoke component that resembles three others.
- **Improve, don't duplicate.** A second near-identical component is a defect, not
  a feature. Extend or refactor what exists before adding a parallel version.
- **Pay down debt opportunistically.** Already in a file and see something clearly
  wrong (dead code, a duplicated pattern)? Fix it in the same change if it is
  low-risk and in scope. Don't go hunting for unrelated debt.
- **No half-finished states.** No feature flag gating correctness, no TODO that
  hides a broken path, no code path that only works for the happy case. If it
  can't be finished in scope, say so instead of leaving a trap.
- **Trust internal invariants.** Validate at real boundaries — user input,
  third-party responses, edge-function payloads. Not everywhere out of habit.
- **Readable over clever.** Optimize for whoever reads this cold in six months.
- **Comment *why*, never *what*.** Well-named code explains what. Comments are for
  hidden constraints, browser quirks, and workarounds — with the reason attached.

---

## 5. UX principles

- **Mobile-first, iPhone-first.** Design and verify at 375–390px first; wider
  layouts are the derived case. 320px (iPhone SE) is the floor, not an edge case.
- **Native-feeling, not web-feeling.** No layout jumps, no visible scrollbars, no
  tap-highlight flashes, no overscroll bounce in the wrong place, no focus rings
  appearing on touch (keyboard focus rings stay).
- **One obvious primary action per screen.** If a screen needs a sentence of
  explanation, it needs another design pass, not a tooltip.
- **Progressive disclosure.** Default views show the minimum needed to act. Depth
  lives one deliberate tap away. The main screen stays *a card and a bottom bar*;
  everything else is a sheet.
- **Every interaction has a purpose.** If you can't say in one sentence why a tap
  target, animation, or screen exists and what it moves the user toward, cut it.
- **Every screen feels connected.** Chrome, theming, and motion language stay
  consistent across routes. A themed chrome color applied to the bottom bar must
  be honored on every other surface that shows chrome.
- **Every interaction is measurable.** See §11.

---

## 6. Design system

**The rule that overrides everything else here: never create a duplicate
component.** Before building a button, input, sheet, or card, search
`src/components/ui/` and `src/components/`. Extend with a prop before forking.

- **Color.** App background `#FAFAF7`. **Hairline borders, never drop shadows** —
  depth comes from a 1px border and a tone shift, not `box-shadow`. **Color is
  reserved for status meaning** — success, active state, destructive action,
  unread — never decoration.
- **Theming.** Ship a themeable chrome layer from day one: `--app-chrome-fg`,
  `--app-chrome-bg`, `--app-accent`, `--app-surface`, `--app-border`, each with a
  hardcoded fallback for the default light theme, so a colored theme retints
  every surface without any consumer branching on theme state.
  Build the theme ramp in **OKLCH**: every accent theme shares one fixed
  lightness/chroma ramp and varies only hue, so all options feel equally vivid;
  within a theme's shade ramp only lightness changes, so shades don't drift purple
  at the light end or muddy at the dark end. Clamp chroma per (L, h) to the sRGB
  gamut, and expose a boosted-chroma P3 variant behind
  `@supports (color: oklch(0 0 0))` with sRGB hex fallbacks.
- **Typography.** Inter. `tabular-nums` everywhere numbers sit side by side
  (counts, prices, timestamps) so digits don't jitter. Type scale comes from
  Tailwind's configured scale — no ad hoc `font-size` in inline styles unless
  matching a fixed pixel-exact asset.
- **Spacing.** Tailwind's spacing scale. Where a pixel-exact value is required
  (safe-area math, a fixed icon pill), compute it once and export it as a named
  constant — never repeat a magic number at call sites.
- **Buttons.** One system: `src/components/ui/button.tsx` with `cva` variants. New
  variants are added to `buttonVariants`, never as a one-off `<button>` with
  inline styles.
- **Inputs.** One system: `input.tsx`, `input-otp.tsx`, `textarea.tsx`,
  `select.tsx`, `form.tsx`, composed with `react-hook-form` + `zod`. Never
  hand-roll validation wiring per form.
- **Touch targets: 44px minimum, everywhere.** The visual glyph may be smaller
  (e.g. a 30px icon) — pad the hit area, never shrink the target to fit the art.
- **Safe areas.** Every fixed-position surface respects `env(safe-area-inset-*)`.
  The standard bottom pad is `max(18px, env(safe-area-inset-bottom))`, defined
  once as a constant.

---

## 7. Motion system

Two jobs, one library family. Don't blur the line.

- **Component-local micro-interactions** — press/hover feedback (`whileTap`,
  `whileHover` with a spring), icon state transitions, the brand mark's
  spin/pulse — use Motion for React directly on the element.
- **Structural motion** — sheets opening and closing, menus, route transitions,
  cards entering or leaving the stack, toasts — is owned by the shared surface
  primitives (§8), never by a one-off `motion.div` bolted onto a feature
  component.
- **Springs for anything gesture-driven** (press, drag, swipe). Easings only for
  things that animate on their own schedule (a toast appearing after a delay).
- **`useReducedMotion()` is mandatory on every animated interaction.** Each
  animation needs a reduced-motion branch that disables it or substitutes an
  instant/cross-fade equivalent. Pattern:
  `animate={reduceMotion ? undefined : { scale: 0.88 }}`.
- **Subtle and purposeful.** Motion communicates state change — pressed, active,
  success, dismissed. If an animation's purpose can't be named, cut it.

---

## 8. Sheet (modal) system

**Exactly one sheet primitive: `BaseSheet` in `src/components/ui/base-sheet.tsx`.**
Feature sheets live in `src/components/sheets/` and consume it. No feature ever
reaches for `vaul` or a raw Radix `Dialog.Root` directly, and no one hand-rolls a
`position: fixed` overlay with custom drag math.

`BaseSheet` owns, once, for every consumer:

- open/close spring and enter/exit animation, with a reduced-motion branch
- drag-to-dismiss gesture with velocity-aware snap
- safe-area-aware padding and a configurable `bottomOffset` so a sheet clears the
  bottom navigation
- backdrop treatment and scroll locking behind it
- accessibility: focus trap while open, focus restored on close, `aria-modal`,
  labeled close target, Escape to dismiss
- chrome theming — a sheet reads `--app-chrome-fg` / `--app-chrome-bg` the same
  way the bottom bar does, so a themed sheet and themed bar never look like they
  belong to different apps
- size variants (`auto`, `half`, `full`) and an optional sticky header/footer slot

If a feature needs something `BaseSheet` can't do, **add a prop to `BaseSheet`** —
don't drop to the primitive for one screen.

Sheets to build on it: menu, settings, preferences, theme picker, auth, submit a
site, save-to-collection, reactions, share/send-to, categories, explore.

---

## 9. Bottom navigation

The bottom bar is the most load-bearing surface in the app and the user's primary
muscle-memory anchor.

- **Exactly five primary actions, always.** The grid (`1fr 1fr 1.65fr 1fr 1fr`,
  center slot wider for the brand action) and the SE-width tap-target math are
  tuned for exactly five. Don't add a sixth or collapse to four without a full
  redesign pass.
- **Each slot represents user intent, not a UI mechanism.** A slot may open a
  sheet or fire a direct action depending on which handlers the caller passes —
  its icon, position, and meaning stay stable either way. Callers configure
  behavior; they never redefine what a slot means.
- **Contextual, not redesigned.** The bar should grow more context-aware over time
  — richer behavior *inside* a slot. Never change slot count, order, or icon
  meaning to achieve it. Muscle memory is a feature.
- **Fixed overlay above everything**, `z-index: 50`. No route or sheet may hide it
  or push content in a way that makes it appear to vanish.
- **Every tap is tracked** (§11).

**Two presentation styles, one behavior layer.** `BottomNav.tsx` is a thin
presentation switch, not the nav itself. It reads a device-local `nav_style_v1`
preference (default `modern`, changeable in Settings) and renders one of:

- `ClassicNav.tsx` — full-width fixed bar.
- `ModernNav.tsx` — compact floating dock: translucent/blurred, tinted via
  `color-mix()` off the same `--app-chrome-*` tokens so it re-themes
  automatically; auto-hides on scroll down, reappears on scroll up or tap; forced
  visible whenever any sheet is open so it never fights a modal.

Both consume the **same** `useNavActions.ts` hook for every slot's behavior and
the same `NavButton.tsx` / `BrandMark.tsx` primitives. **Never fork business logic
between the two styles** — a new slot behavior, sheet, or tracked tap goes into
`useNavActions.ts` once; only chrome (size, motion, shell) differs.

Page layout reserves bottom space via `navContentReserve(navStyle)`: Classic
reserves the full bar height; Modern reserves only the safe area, since the dock
floats over content. Sheets use the full bar height as `bottomOffset` in both
styles — uniform and correct, since the dock hides itself whenever a sheet opens.

Reflect the nav style onto `<html data-app-nav="modern|classic">` so CSS-only
concerns can gate on it without every consumer reading React state.

---

## 10. Icon system

Build `src/components/icons/` as a registry, and never grow a parallel one.

- **Semantic names, not asset names.** `IconName` in `icons/types.ts` is a closed
  union. Call sites never import a raw asset — they use semantic wrappers
  (`MenuIcon`, `SaveIcon`, `ShareIcon`, …) in `icons/index.tsx`, each a thin
  wrapper over `<AppIcon name="..." />`.
- **One registry, one source of truth.** `icons/registry.ts` maps each `IconName`
  to its current asset. When artwork changes (placeholder → final vector), only
  `registry.ts` changes and every consumer picks it up.
- **Adding an icon:** add the name to the `IconName` union first (so a typo fails
  to compile), wire the asset in `registry.ts`, export a semantic component. Never
  inline an `<img>` or raw `<svg>` for something that is conceptually a UI icon.
- **State contract.** Every icon accepts `IconState`:
  `idle | pressed | active | disabled | loading | success`. An icon that can't
  express all six still accepts the prop and no-ops the rest — no bespoke prop
  shapes.
- **Mascot rule.** The mascot stays a single solid color across every icon and
  every theme. Color, glow, shimmer, and pulse live on a separate accent-mark
  layer — never recolor the mascot itself. That's what lets it read as one
  consistent character across a fully themeable UI.

---

## 11. Analytics

**Every meaningful interaction is measurable, or it doesn't ship.**

The pattern: a device-scoped anonymous id (`getDeviceId()` from
`src/lib/device-id.ts`, persisted in `localStorage`) plus
`recordEvent(deviceId, kind)` calling a `record_event` Postgres RPC.
Fire-and-forget, non-blocking, no account required, never throws into the UI.

Event kinds are a **TypeScript union**, not free-form strings, so a typo fails to
compile. Must be tracked from day one:

- navigation bar taps — every slot
- reactions — like / pass / not-for-me / report / block
- comments — posted, replied, deleted
- share and send-to
- discovery — advance, category change, feed change
- collections — created, item saved, item removed, collection shared
- errors — every surfaced failure, not just console logs
- navigation — route and sheet opens that represent a real user decision, not
  every internal state change

If you can't tell from the events table whether a feature is used, adopted, or
abandoned, the feature isn't finished.

---

## 12. Backend

**Schema lives in `supabase/migrations/`.** Every table has Row Level Security
enabled with explicit policies — no table ships with RLS off, and no policy is
broader than the feature needs. Write the migration first, then regenerate types.

Core tables: `sites`, `site_tags`, `discoveries`, `reactions`, `collections`,
`collection_items`, `comments`, `events`, `profiles`, `submissions`, `reports`.

**Edge function conventions (non-negotiable, apply to every function):**

- A top-level `try`/`catch` around the whole handler.
- **Always** return JSON through a shared `json(body, status)` helper — never a
  bare `new Response`, never an uncaught throw reaching the runtime.
- Handle the CORS preflight (`OPTIONS`) and set CORS headers on **every** response
  path, including errors.
- Every outbound `fetch` gets an `AbortController` timeout. No unbounded requests.
- Validate the payload with `zod` at the top of the handler; reject with 400 and a
  useful message.
- Rate-limit anything a user can trigger anonymously (submission, screenshot
  capture, report).
- Shared logic lives in `supabase/functions/_shared/`; `config.toml` sets
  per-function `verify_jwt`.

Functions to expect: `submit-site`, `check-embeddable`, `capture-screenshot`,
`enrich-site-metadata`, `classify-submission`, `image-proxy`, plus billing
webhooks if payments are in scope.

**Auth.** Email magic-link only. Do not add OAuth providers unless explicitly
asked. Sessions are SSR-aware — the server client reads cookies through the
TanStack Start request context so the first paint isn't a logged-out flash.

---

## 13. Build order

Work one milestone at a time. Do not start the next until the current one builds
clean, passes lint, and has been self-reviewed against §15.

1. **Shell** — routes, `__root.tsx`, theme token layer + OKLCH ramp, Tailwind
   config, `brand.ts`, `device-id.ts`. Bottom nav (both styles) with five slots
   wired to `useNavActions`. Discovery card fed by a local seed array. No backend.
2. **Sheet system** — `BaseSheet` with the full contract from §8, plus the menu,
   settings, and theme-picker sheets built on it. Nav style picker in settings.
3. **Icon system** — registry, semantic wrappers, state contract, placeholder art.
4. **Backend foundation** — Supabase project, migrations for `sites` / `events` /
   `profiles`, RLS policies, generated types, `record_event` RPC, real discovery
   feed replacing seed data.
5. **Reactions and analytics** — reaction sheet, event union, every §11 event
   firing.
6. **Auth and profiles** — magic-link flow in a sheet, SSR session, profile row.
7. **Collections** — save-to-collection sheet, collection detail route, public
   share page rendered server-side.
8. **Submission pipeline** — submit sheet, `submit-site`, embeddability check,
   metadata enrichment, screenshot capture, preview-card fallback rendering.
9. **Comments** — one thread per site, Realtime updates, moderation/report path.
10. **Trails** — ordered collections and guided reader mode.
11. **Admin** — PIN-gated route for submissions, reports, and enrichment status.

---

## 14. Performance

- **Avoid unnecessary re-renders.** Prefer narrow local state and derived values
  over broad context re-renders for anything that updates per frame or per tap
  (drag position, press state). Memoize expensive derived data — not everything
  by reflex.
- **Keep SVGs simple.** Inline SVGs used for themed/mono icon variants stay plain
  path data. Avoid filters, masks, and heavy gradients on any element that also
  carries a CSS transform — masking under a 3D-transformed ancestor is a known
  WebKit rendering bug. If you must, document the constraint in a comment.
- **Lazy load** routes, sheets, and heavy components (editors, charts, admin
  views) that aren't needed for the first paint of the discovery screen.
- **Hold 60fps during gesture-driven motion** (sheet drag, card swipe). Animate
  `transform` and `opacity` only; never animate layout properties.
- **Prioritize perceived performance.** Optimistic UI, skeletons, and instant
  local press feedback beat waiting for a round trip — especially on the critical
  discovery loop.

---

## 15. Definition of done

Before calling any change complete, self-review against this and fix what fails.
Don't hand back work with known gaps.

- **Correctness** — handles the real data shapes and edge cases: empty states,
  slow network, denied permissions, missing images, dead links.
- **Accessibility** — 44px tap targets at 320px width; `aria-label` on every
  icon-only control; `aria-pressed`/`aria-current` for toggled state; decorative
  SVGs `aria-hidden`; focus order matches visual order; sheets trap and restore
  focus; Escape dismisses; reduced motion honored; WCAG AA contrast **on every
  theme**, not just the default. Any signal carried by color or glow is paired
  with something a screen reader or colorblind user can perceive.
- **Mobile Safari** — the primary runtime. Safe-area insets, momentum scrolling,
  `100vh`/dynamic viewport quirks, and any transform/mask interaction verified
  there, not only in desktop Chrome devtools.
- **Theme consistency** — respects the `--app-chrome-*` tokens and renders
  correctly on every theme.
- **Motion consistency** — right layer for the job, spring for gesture-driven
  motion, reduced-motion branch present.
- **Performance** — no avoidable re-renders, no heavy work blocking first paint of
  the discovery loop.
- **Typography & spacing** — Inter, `tabular-nums` where numbers align, spacing
  scale or a named constant instead of scattered magic numbers.
- **Analytics** — every new interaction has an event.
- **Dead code** — nothing left from iteration: unused imports, stale props,
  commented-out attempts.
- **Regressions** — if a shared primitive changed (nav, `BaseSheet`, icon
  registry, theme tokens), check the other call sites. Don't assume isolation.
- **Brand independence** — grep the diff: no reference to any third-party or
  predecessor product name, and no brand string outside `brand.ts`.
- **Build** — `bun run build` and `bun run lint` both pass.

---

## 16. Before writing code (do this silently, every time)

1. Read the components and files you're about to touch or extend — not just the
   one you're about to create.
2. Search for an existing component, hook, or API wrapper that already does most
   of the job.
3. Note UX inconsistencies in the area you're touching: a mismatched spacing
   value, a sheet not on `BaseSheet`, a missing analytics hook, a sub-44px target.
4. Decide whether to improve the existing implementation in the same change
   rather than building next to it. Prefer improving.
