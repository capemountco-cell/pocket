import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Whether an origin lets us render it in a frame is a property of its
// response headers, never a guess: a wrong answer is a blank screen, because
// a browser-blocked frame paints the browser's own error page and fires no
// event we can catch. The header is respected, never bypassed -- a site that
// refuses framing is still served, as a preview card (see SiteViewer).

// Origins that hang are as bad as origins that refuse, so every probe is
// bounded.
const PROBE_TIMEOUT_MS = 6000;

// Identify the probe honestly so an origin can recognize and block it.
const PROBE_UA = "Mozilla/5.0 (compatible; DiscoveryBot/1.0; +https://pockettt.lovable.app)";

const inputSchema = z.object({
  url: z.string().url().max(2048),
});

export type EmbedProbe = {
  ok: boolean;
  embeddable: boolean;
  url: string;
  domain: string;
  title: string;
  reason?: string;
};

function normalizeUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    // Only the two web schemes; `javascript:` and friends never reach a frame.
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

// A frame is allowed unless the origin says otherwise. `X-Frame-Options` is
// all-or-nothing for our purposes (DENY and SAMEORIGIN both block a
// cross-origin frame); CSP `frame-ancestors` blocks unless it names a host we
// can't match here, so anything narrower than `*` counts as a refusal.
function readsAsFramable(headers: Headers): { embeddable: boolean; reason?: string } {
  const xfo = headers.get("x-frame-options")?.trim().toLowerCase();
  if (xfo && (xfo.includes("deny") || xfo.includes("sameorigin") || xfo.includes("allow-from"))) {
    return { embeddable: false, reason: `x-frame-options: ${xfo}` };
  }

  const csp = headers.get("content-security-policy")?.toLowerCase() ?? "";
  const directive = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("frame-ancestors"));
  if (directive) {
    const value = directive.slice("frame-ancestors".length).trim();
    if (value !== "*" && !value.startsWith("* ")) {
      return { embeddable: false, reason: `frame-ancestors: ${value}` };
    }
  }

  return { embeddable: true };
}

function titleFrom(url: URL): string {
  const host = url.hostname.replace(/^www\./, "");
  const label = host.split(".")[0] ?? host;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Probe one URL's live response headers. Never throws into the UI: an
 * unreachable origin comes back `ok: false` so the caller can say so plainly
 * instead of adding a site that renders as a blank rectangle.
 */
export const probeEmbeddable = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<EmbedProbe> => {
    const url = normalizeUrl(data.url);
    if (!url) {
      return {
        ok: false,
        embeddable: false,
        url: data.url,
        domain: "",
        title: "",
        reason: "Only http and https addresses can be served.",
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": PROBE_UA, accept: "text/html,*/*" },
      });

      const final = normalizeUrl(response.url) ?? url;
      const domain = final.hostname.replace(/^www\./, "");

      if (!response.ok) {
        return {
          ok: false,
          embeddable: false,
          url: final.toString(),
          domain,
          title: titleFrom(final),
          reason: `The site answered ${response.status}.`,
        };
      }

      const { embeddable, reason } = readsAsFramable(response.headers);
      const html = await response.text();
      const match = /<title[^>]*>([^<]{1,200})<\/title>/i.exec(html);
      const title = match?.[1]?.trim() || titleFrom(final);

      return {
        ok: true,
        embeddable,
        url: final.toString(),
        domain,
        title,
        ...(reason ? { reason } : {}),
      };
    } catch {
      return {
        ok: false,
        embeddable: false,
        url: url.toString(),
        domain: url.hostname.replace(/^www\./, ""),
        title: titleFrom(url),
        reason: "That address didn't answer in time.",
      };
    } finally {
      clearTimeout(timer);
    }
  });
