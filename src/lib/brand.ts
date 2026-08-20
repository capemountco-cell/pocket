/**
 * The single source of truth for brand-facing strings.
 * Every user-visible mention of the product name must import from here.
 * Code identifiers, CSS variables, storage keys and event names stay neutral.
 */
export const APP_NAME = "Pocket";
export const APP_TAGLINE = "One tap. One corner of the web.";

/** The domain the app actually ships on. Absolute URLs for social cards are
 *  built from this, and a crawler follows what it is told, so a wrong value
 *  here silently points every share preview at a site that isn't ours. */
export const APP_DOMAIN = "p-o-c-k-e-t.com";
export const APP_ORIGIN = `https://${APP_DOMAIN}`;

/** What a search result and a shared link say. Kept beside the name so the
 *  wording is changed in one place rather than in each route's head(). */
export const APP_TITLE = `${APP_NAME} — one tap, one great site`;
export const APP_DESCRIPTION =
  "Tap once and get a single hand-picked site, full screen. Like it, save it for later, send it to a friend — then tap again for the next one.";

/** The social preview card. 1200x630, the size every platform crops from. */
export const APP_SOCIAL_IMAGE = `${APP_ORIGIN}/og-card.png`;

/**
 * One file cannot import from here: `public/site.webmanifest` is fetched by
 * the browser as raw JSON, so its `name`, `short_name` and `description` are
 * literal copies of APP_NAME and APP_DESCRIPTION above. Change either of
 * those and change the manifest in the same commit -- nothing enforces it,
 * and the mismatch only shows up on someone's home screen.
 */
