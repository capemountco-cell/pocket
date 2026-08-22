import { createServerFn } from "@tanstack/react-start";

/**
 * Is this link adult, and how sure are we?
 *
 * Adult links are not refused any more -- they are priced. They stay out of
 * the free queue and off the earned board, and the only way onto the page is
 * to bid for a place, which is the same mechanic every other paid position
 * uses. So this does not decide whether a link is allowed. It decides which
 * of the two doors it goes through, and being wrong in the strict direction
 * costs someone a bid they did not owe.
 *
 * That is why the threshold is high and the model is asked for a number
 * rather than a verdict. A borderline page goes through the free door.
 *
 * The judgement runs here rather than in classify-submission, which is the
 * usual home for it: that function lives in the other repository and its
 * deploy pipeline has never once succeeded, so anything added to it would be
 * written and never run. A server function ships with this app.
 */

export type AdultVerdict = {
  adult: boolean;
  /** 0 to 1. Reported even when under the threshold, so tuning is possible. */
  score: number;
  /** Short, for the person submitting. Never a rule they could game. */
  reason: string;
  /** False when no key was configured and the fallback decided this. */
  judged: boolean;
};

// Over this, a link is priced rather than queued. Set well above a coin flip
// on purpose: a false positive asks an innocent site for money, which is a
// far worse failure than an adult site slipping into the queue, where the
// existing report-and-review path already catches it.
const ADULT_THRESHOLD = 0.8;

// The cheapest model that can read a page and return a number. Overridable
// without a deploy, because the cheapest option changes every few months.
const DEFAULT_MODEL = "gpt-5-nano";

const FETCH_TIMEOUT_MS = 6000;
const MAX_PAGE_BYTES = 120_000;
const SNIPPET_CHARS = 900;

const PROBE_UA =
  "Mozilla/5.0 (compatible; PocketBot/1.0; +https://p-o-c-k-e-t.com) AppleWebKit/537.36";

function env(...names: string[]): string | undefined {
  // Nitro's Cloudflare preset populates process.env from the worker bindings.
  // Guarded anyway: this file is imported by client code that never runs the
  // handler, and `process` is not a thing in a browser.
  //
  // Several names, first non-empty wins. Unlike the browser side this is a
  // real lookup at runtime rather than a build-time substitution, so any name
  // works and the list is only about what the deployment panel will accept.
  try {
    if (typeof process === "undefined") return undefined;
    for (const name of names) {
      const value = process.env[name];
      if (typeof value === "string" && value.trim().length > 0) return value.trim();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * What the page says about itself.
 *
 * The address alone is a poor signal in both directions -- plenty of adult
 * sites read as innocuous, and plenty of ordinary words look lurid out of
 * context. A title, a description and a little visible text cost one request
 * and decide most cases on their own.
 */
async function readPage(
  url: string,
): Promise<{ title: string; description: string; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": PROBE_UA, accept: "text/html,*/*" },
    });
    const raw = (await response.text()).slice(0, MAX_PAGE_BYTES);
    const title = raw.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i)?.[1] ?? "";
    const description =
      raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]{0,400}?)["']/i)?.[1] ??
      "";
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, SNIPPET_CHARS);
    return { title: decode(title), description: decode(description), text };
  } catch {
    // An unreachable page is judged on its address alone. Thin, but the model
    // still catches the obvious cases and the threshold protects the rest.
    return { title: "", description: "", text: "" };
  } finally {
    clearTimeout(timer);
  }
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const SYSTEM = [
  "You rate whether a web page is adult (pornographic or sexually explicit) content.",
  'Answer with JSON only: {"score": <number 0-1>, "reason": "<8 words or fewer>"}.',
  "score 1 means unambiguously pornographic. score 0 means clearly not.",
  "Nudity in art, medicine, sex education, or news reporting is NOT adult: score below 0.3.",
  "Dating, lingerie retail, and mature-themed games are NOT adult unless sexually explicit.",
  "If the evidence is thin or you are unsure, score below 0.5.",
].join(" ");

/** The obvious cases, for when no key is configured. Deliberately narrow. */
function fallbackScore(url: string, page: { title: string; description: string }): number {
  const haystack = `${url} ${page.title} ${page.description}`.toLowerCase();
  const strong = /\b(porn|pornhub|xvideos|xhamster|redtube|onlyfans|camgirl|hentai|nsfw|xxx)\b/;
  return strong.test(haystack) ? 0.9 : 0;
}

export const classifyAdult = createServerFn({ method: "POST" })
  .validator((data: unknown): { url: string } => {
    const url = (data as { url?: unknown } | null)?.url;
    if (typeof url !== "string" || url.trim().length === 0) {
      throw new Error("A URL is required.");
    }
    return { url: url.trim() };
  })
  .handler(async ({ data }): Promise<AdultVerdict> => {
    let target: URL;
    try {
      target = new URL(data.url);
    } catch {
      return { adult: false, score: 0, reason: "", judged: false };
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return { adult: false, score: 0, reason: "", judged: false };
    }

    const page = await readPage(target.toString());
    const key = env("POCKET_OPENAI_API_KEY", "OPENAI_API_KEY");

    if (!key) {
      const score = fallbackScore(target.toString(), page);
      return {
        adult: score >= ADULT_THRESHOLD,
        score,
        reason: score > 0 ? "Adult content" : "",
        judged: false,
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: env("POCKET_OPENAI_MODEL", "OPENAI_ADULT_MODEL") ?? DEFAULT_MODEL,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: [
                `URL: ${target.toString()}`,
                `Title: ${page.title || "(none)"}`,
                `Description: ${page.description || "(none)"}`,
                `Text: ${page.text || "(none)"}`,
              ].join("\n"),
            },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 200,
        }),
      });

      if (!response.ok) throw new Error(`openai ${response.status}`);
      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as { score?: unknown; reason?: unknown };
      const score = Math.max(0, Math.min(1, Number(parsed.score ?? 0)));
      if (!Number.isFinite(score)) throw new Error("no score");
      return {
        adult: score >= ADULT_THRESHOLD,
        score,
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 80) : "",
        judged: true,
      };
    } catch {
      // A model that will not answer must not become a gate that refuses
      // everything, nor one that waves everything through -- the narrow
      // keyword list still catches the unambiguous cases.
      const score = fallbackScore(target.toString(), page);
      return {
        adult: score >= ADULT_THRESHOLD,
        score,
        reason: score > 0 ? "Adult content" : "",
        judged: false,
      };
    }
  });

export { ADULT_THRESHOLD };
