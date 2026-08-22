import { createServerFn } from "@tanstack/react-start";
import { mechanicalReason, type IntentVerdict, type PricedReason } from "@/lib/submission-gate";

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
  /** Whether this link buys its place rather than being given one. */
  intent: IntentVerdict;
};

// Over this, a page reads as somebody's own thing rather than something worth
// stumbling onto. Same direction as the adult threshold and for the same
// reason: the expensive mistake is charging a site that owed nothing.
const INTENT_THRESHOLD = 0.75;

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
  // The word "json" in lower case is load-bearing, not a typo for "JSON".
  // response_format: json_object is refused outright unless a message contains
  // it -- OpenAI answers 400 invalid_request_error, param "messages", and
  // every call this file makes was failing on exactly that. The prompt already
  // said "JSON" in capitals, which was not enough.
  "You rate a web page on two independent axes and reply with json only, as a",
  "single json object:",
  '{"adult": <0-1>, "own": <0-1>, "kind": "personal"|"commerce"|"blog"|"none", "reason": "<8 words or fewer>"}.',
  "",
  "adult: 1 means unambiguously pornographic, 0 means clearly not.",
  "Nudity in art, medicine, sex education, or news reporting is NOT adult: below 0.3.",
  "Dating, lingerie retail, and mature-themed games are NOT adult unless sexually explicit.",
  "",
  "own: how strongly this page exists to promote whoever made it.",
  "1 means a personal homepage, portfolio, CV, freelance or agency site, a shop or",
  "product landing page, or a personal blog -- something its owner submits to be seen.",
  "0 means something worth stumbling onto regardless of who made it: a toy, a game,",
  "a visualisation, a tool, an archive, a reference, an essay on a subject rather than",
  'on its author. Set "kind" to which of personal, commerce or blog applies, or "none".',
  "",
  "A hobby project, demo or experiment is NOT self-promotion even on a personal domain:",
  "score own below 0.3. A blog ABOUT a subject is not a personal blog; a blog about its",
  "author's life, work or services is. If the evidence is thin or you are unsure, score",
  "both below 0.5.",
].join(" ");

/**
 * The exact request the classifier makes.
 *
 * Shared with the diagnostic below rather than reimplemented there. A
 * diagnostic that builds a lookalike request tests the lookalike: this file
 * spent five rounds failing on a difference between the two, and the way that
 * does not happen again is that there is only one.
 */
function classifyRequest(url: string, page: { title: string; description: string; text: string }) {
  const model = env("POCKET_OPENAI_MODEL", "OPENAI_ADULT_MODEL") ?? DEFAULT_MODEL;
  return {
    model,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          `URL: ${url}`,
          `Title: ${page.title || "(none)"}`,
          `Description: ${page.description || "(none)"}`,
          `Text: ${page.text || "(none)"}`,
        ].join("\n"),
      },
    ],
    response_format: { type: "json_object" },
    // A reasoning model spends this budget thinking before it writes anything,
    // and at 800 it spent all of it: the diagnostic came back finish "length"
    // with an empty answer, a 200 that parsed to nothing. Two changes, because
    // either alone leaves the failure reachable.
    max_completion_tokens: 2000,
    // Rating a page on two axes is not a problem that rewards deliberation.
    // Sent only to the gpt-5 family, which is the only one that accepts it --
    // the model is overridable without a deploy, and a parameter the
    // replacement rejects would 400 every call the way the missing "json" did.
    ...(model.startsWith("gpt-5") ? { reasoning_effort: "minimal" } : {}),
  };
}

const NOT_PRICED = {
  intent: { priced: false, reason: null, score: 0, judged: false },
} satisfies { intent: IntentVerdict };

function clamp01(value: unknown): number {
  return Math.max(0, Math.min(1, Number(value ?? 0)));
}

/** The obvious cases, for when no key is configured. Deliberately narrow. */
function fallbackScore(url: string, page: { title: string; description: string }): number {
  const haystack = `${url} ${page.title} ${page.description}`.toLowerCase();
  const strong = /\b(porn|pornhub|xvideos|xhamster|redtube|onlyfans|camgirl|hentai|nsfw|xxx)\b/;
  return strong.test(haystack) ? 0.9 : 0;
}

/** What one real round trip to the model did. */
export type AiProbe = {
  /** The model answered, and there was something in the answer. */
  ok: boolean;
  /** OpenAI's HTTP status, or 0 when the request never got that far. */
  status: number;
  /**
   * OpenAI's own error code -- "invalid_api_key", "model_not_found",
   * "insufficient_quota" -- or a label for a request that never reached them.
   */
  code: string;
  /**
   * OpenAI's explanation, on everything except a 401.
   *
   * The exception is the whole reason this field is separate from the code. A
   * 401 body reads "Incorrect API key provided: sk-abc...xyz" -- a masked
   * secret is still a secret, so that one case returns nothing. Every other
   * status describes a parameter rather than a credential, and a code alone
   * ("invalid_request_error") does not say which parameter, which is exactly
   * what this had to be extended to find out.
   */
  detail: string;
  /** The parameter OpenAI objected to, when it named one. */
  param: string;
  /** OpenAI's stop reason. "length" means the budget ran out mid-thought. */
  finish: string;
  /**
   * The start of what came back, so a malformed answer can be read rather
   * than guessed at. Two lines at most, and only ever the model's own words
   * about a public page.
   */
  sample: string;
  /**
   * Answered, with nothing in it. Worth its own field because it is what a
   * reasoning model does when the token budget is too small to leave room for
   * an answer after it has finished thinking -- a failure that looks like
   * success from every angle except this one.
   */
  empty: boolean;
};

export type AiConfigReport = {
  openaiKey: boolean;
  model: string;
  runtime: string;
  /** Null unless asked for. It costs a real request, so it is not free. */
  probe: AiProbe | null;
};

// Enough for {"ok":1} after a reasoning model has finished thinking. Sixteen
// was enough for the answer and not for the thinking that precedes it, which
// would have come back as a 200 with nothing in it.
const PROBE_TOKENS = 300;

/**
 * Whether the server this app runs on can see an OpenAI key, and whether that
 * key actually works.
 *
 * Two questions, because answering only the first one is a trap this project
 * walked into: the key was present and the classifier was still returning an
 * unjudged verdict for every link, which the code reported as a calm
 * `judged: false` and nothing else. A key that is set and a key that works are
 * different facts and this reports them separately.
 *
 * Booleans and status codes only, never a value or a prefix of one.
 *
 * Worth being precise about which process is being asked. This runs in the
 * app's own SSR runtime, not in a Supabase edge function -- two different
 * places with two different environments. A secret set for edge functions is
 * not automatically visible here, and this is what settles which is which.
 */
export const checkAiConfig = createServerFn({ method: "GET" })
  .validator((data: unknown): { probe: boolean; url: string } => {
    const raw = data as { probe?: unknown; url?: unknown } | null;
    return {
      probe: raw?.probe === true,
      // With a url, the diagnostic stops being a lookalike: it reads that page
      // and sends the classifier's own request about it.
      url: typeof raw?.url === "string" ? raw.url.trim() : "",
    };
  })
  .handler(async ({ data }): Promise<AiConfigReport> => {
    const key = env("POCKET_OPENAI_API_KEY", "OPENAI_API_KEY");
    const report: AiConfigReport = {
      openaiKey: key !== undefined,
      model: env("POCKET_OPENAI_MODEL", "OPENAI_ADULT_MODEL") ?? DEFAULT_MODEL,
      // Names the process that answered, so a result can never be attributed
      // to the wrong one.
      runtime: typeof process !== "undefined" ? "app-server" : "unknown",
      probe: null,
    };
    if (!data.probe || !key) return report;
    return { ...report, probe: await probeModel(key, report.model, data.url) };
  });

/**
 * One call. With a url it is the classifier's own request about that page;
 * without one it is the smallest thing that can prove the endpoint answers.
 */
async function probeModel(key: string, model: string, url: string): Promise<AiProbe> {
  try {
    const body = url
      ? classifyRequest(url, await readPage(url))
      : {
          model,
          messages: [
            // Contains "json" for the same reason the system prompt does.
            { role: "user", content: 'Reply with the json object {"ok":1} and nothing else.' },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: PROBE_TOKENS,
        };
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: unknown; type?: unknown; message?: unknown; param?: unknown };
      } | null;
      const code = body?.error?.code ?? body?.error?.type;
      const message = body?.error?.message;
      return {
        ok: false,
        status: response.status,
        code: typeof code === "string" ? code : "unknown",
        // Withheld on a 401 and only on a 401. See the field's own note.
        detail: response.status !== 401 && typeof message === "string" ? message.slice(0, 300) : "",
        param: typeof body?.error?.param === "string" ? body.error.param : "",
        empty: false,
        finish: "",
        sample: "",
      };
    }

    const answer = (await response.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    };
    const content = (answer.choices?.[0]?.message?.content ?? "").trim();
    const finish = answer.choices?.[0]?.finish_reason ?? "";
    return {
      ok: content.length > 0,
      status: response.status,
      code: content.length > 0 ? "" : finish || "empty",
      detail: "",
      param: "",
      empty: content.length === 0,
      finish,
      sample: content.slice(0, 200),
    };
  } catch (error) {
    // The class of failure, not its text: a network error message can carry a
    // URL, and this one has a key in the headers next to it.
    return {
      ok: false,
      status: 0,
      code: error instanceof Error ? error.name : "unreachable",
      detail: "",
      param: "",
      empty: false,
      finish: "",
      sample: "",
    };
  }
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
      return { adult: false, score: 0, reason: "", judged: false, ...NOT_PRICED };
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return { adult: false, score: 0, reason: "", judged: false, ...NOT_PRICED };
    }

    // Decided from the address alone, before anything is fetched. A shortener
    // cannot be read at all, and a builder subdomain does not need reading.
    const mechanical = mechanicalReason(target.toString());

    const page = await readPage(target.toString());
    const key = env("POCKET_OPENAI_API_KEY", "OPENAI_API_KEY");

    if (!key) {
      const score = fallbackScore(target.toString(), page);
      return {
        adult: score >= ADULT_THRESHOLD,
        score,
        reason: score > 0 ? "Adult content" : "",
        judged: false,
        // The mechanical half still holds without a model. The judged half
        // fails open: with nothing to read the page with, a link gets the
        // free door rather than an invoice it may not owe.
        intent: {
          priced: mechanical !== null,
          reason: mechanical,
          score: mechanical ? 1 : 0,
          judged: false,
        },
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(classifyRequest(target.toString(), page)),
      });

      if (!response.ok) throw new Error(`openai ${response.status}`);
      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as {
        adult?: unknown;
        own?: unknown;
        kind?: unknown;
        reason?: unknown;
      };
      // An answer with no number in it is not an answer, and clamping it
      // would turn silence into a confident "not adult, not priced" that
      // nothing ever judged. Fall through to the fallback instead, which at
      // least reports itself honestly as unjudged.
      if (parsed.adult === undefined || parsed.adult === null) throw new Error("no verdict");
      const score = clamp01(parsed.adult);
      const own = clamp01(parsed.own);

      const kind = ["personal", "commerce", "blog"].includes(String(parsed.kind))
        ? (String(parsed.kind) as PricedReason)
        : null;
      // Mechanical wins the label when both fire: "shortened" and "on a
      // builder's subdomain" are facts, and a fact explains better than an
      // inference when someone is being asked for money.
      const judgedPrice = own >= INTENT_THRESHOLD && kind !== null;

      return {
        adult: score >= ADULT_THRESHOLD,
        score,
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 80) : "",
        judged: true,
        intent: {
          priced: mechanical !== null || judgedPrice,
          reason: mechanical ?? (judgedPrice ? kind : null),
          score: mechanical ? 1 : own,
          judged: true,
        },
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
        intent: {
          priced: mechanical !== null,
          reason: mechanical,
          score: mechanical ? 1 : 0,
          judged: false,
        },
      };
    }
  });

export { ADULT_THRESHOLD };
