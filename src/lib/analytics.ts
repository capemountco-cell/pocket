import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { APP_DOMAIN } from "@/lib/brand";

/**
 * Third-party page analytics.
 *
 * The tags are declared by the root route -- see src/routes/__root.tsx -- and
 * nowhere else, so the browser gets exactly one copy of each: the router owns
 * the head tag for the life of the root match, so a client-side navigation, a
 * rerender, hydration or a hot reload re-use it rather than appending a second
 * copy and double-counting every page.
 *
 * This is additive. The app's own first-party events (recordEvent, in
 * src/lib/discovery.ts) are untouched and keep going to the database.
 */
const SIMPLE_ANALYTICS_SRC = "https://scripts.simpleanalyticscdn.com/latest.js";
const SIMPLE_ANALYTICS_NOSCRIPT = "https://queue.simpleanalyticscdn.com/noscript.gif";

/**
 * Only the live site reports.
 *
 * Dev machines, Lovable preview builds and any future staging host never load
 * the script at all, so production numbers stay production numbers rather than
 * relying on the vendor to discard what it does not recognise.
 *
 * Hosts are compared without a port, so a proxied or non-default-port
 * deployment of the real domain still counts.
 */
const PRODUCTION_HOSTS = new Set([APP_DOMAIN, `www.${APP_DOMAIN}`]);

/**
 * The host being served, on whichever side of the render this is called from.
 *
 * The server half exists because the tag has to be in the HTML that goes over
 * the wire rather than being added after hydration -- which means the decision
 * has to be made before there is a `window` to ask. createIsomorphicFn keeps
 * the server-only import out of the browser bundle.
 */
const currentHost = createIsomorphicFn()
  .server(() => getRequestHost({ xForwardedHost: true }))
  .client(() => window.location.host);

/** Whether this render is being served from the live site. */
export function isProductionHost(): boolean {
  const host = (currentHost() ?? "").toLowerCase();
  const withoutPort = host.split(":")[0] ?? "";
  return PRODUCTION_HOSTS.has(withoutPort);
}

/**
 * Analytics tags for the root route's `head()`, or nothing off production.
 *
 * Do Not Track is left at the vendor's default, which is to skip those
 * visitors entirely. The attribute that would change that is
 * `data-collect-dnt="true"`, and it does the opposite of what its name
 * suggests: it tells the script to record DNT visitors anyway. It is
 * deliberately absent, so a visitor asking not to be tracked is not counted.
 */
export function analyticsHeadScripts(): Array<Record<string, unknown>> {
  if (!isProductionHost()) return [];
  return [{ src: SIMPLE_ANALYTICS_SRC, async: true }];
}

/**
 * The pixel that counts a visit when scripts are off, or null off production.
 *
 * It belongs in the body rather than beside the script: a <noscript> in <head>
 * may only contain link, style and meta, so an <img> there is invalid markup
 * and browsers hoist it out of the head anyway.
 */
export function analyticsNoscriptImage(): { src: string } | null {
  if (!isProductionHost()) return null;
  return { src: SIMPLE_ANALYTICS_NOSCRIPT };
}
