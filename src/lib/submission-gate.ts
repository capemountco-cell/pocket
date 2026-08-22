/**
 * Which door a submitted link goes through.
 *
 * Two doors, not two verdicts. The free queue is for things worth stumbling
 * onto; the board is for anything whose reason for being submitted is that
 * someone wants it seen. Neither is a rejection -- a priced link is still
 * welcome, it just buys its place instead of being given one.
 *
 * What gets priced: a personal site, a shop or product page, a personal blog,
 * anything living on a site builder's subdomain, and any shortened address.
 * They share one thing -- the submitter is usually the owner, and free
 * placement would be advertising that nobody paid for.
 *
 * Two of those are decided mechanically and the rest by a model.
 *
 * A shortener is mechanical because it has to be: the destination is hidden,
 * so there is nothing to read and no judgement to make. An unreadable link
 * does not get a free place.
 *
 * A site-builder subdomain is mechanical because it is a fact about the
 * address rather than an opinion about the page. It is also the rule with the
 * widest reach, so it is worth knowing the size of it: 179 of the 2,072 live
 * sites sit on one of these hosts -- 8.6% -- and they hold 18 of 655 likes,
 * or 2.7%. They earn about a third of their share, which is what makes the
 * rule defensible rather than merely convenient. It applies to new
 * submissions only; nothing already in the catalogue moves.
 *
 * Personal, commercial and blog are judgements about what a page is for, so
 * they go to the model, which reads the page rather than the address. The
 * threshold is high in the same direction as everything else here: a wrong
 * call in the strict direction asks an innocent site for money.
 */

/** Why a link was sent to the board. Drives the sentence shown on arrival. */
export type PricedReason = "shortener" | "hosted" | "personal" | "commerce" | "blog";

export type IntentVerdict = {
  /** Must bid rather than being added free. */
  priced: boolean;
  reason: PricedReason | null;
  /** 0 to 1 for the model's categories; 1 for the mechanical ones. */
  score: number;
  /** False when no key was configured and only the mechanical rules ran. */
  judged: boolean;
};

/**
 * Addresses that hide where they go. There is no reading a page you cannot
 * resolve, so these are priced without asking anything.
 */
const SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "is.gd",
  "rb.gy",
  "cutt.ly",
  "rebrand.ly",
  "lnkd.in",
  "tiny.cc",
  "shorturl.at",
  "short.io",
  "s.id",
  "v.gd",
  "trib.al",
  "dlvr.it",
  "shorte.st",
  "adf.ly",
]);

/**
 * Site builders and app hosts that hand out a subdomain.
 *
 * A list rather than a pattern, so adding or removing one is a visible edit
 * with a name attached instead of a regex quietly widening. Matched on the
 * suffix, so a project on any of them is caught however deep the path goes.
 */
const HOSTED_SUFFIXES = [
  "neocities.org",
  "nekoweb.org",
  "github.io",
  "gitlab.io",
  "vercel.app",
  "netlify.app",
  "pages.dev",
  "web.app",
  "firebaseapp.com",
  "glitch.me",
  "replit.app",
  "repl.co",
  "lovable.app",
  "webflow.io",
  "carrd.co",
  "notion.site",
  "framer.website",
  "strikingly.com",
  "wixsite.com",
  "squarespace.com",
  "myshopify.com",
  "bigcartel.com",
  "gumroad.com",
  "etsy.com",
  "substack.com",
  "wordpress.com",
  "blogspot.com",
  "weebly.com",
  "tumblr.com",
  "medium.com",
  "ghost.io",
  "bearblog.dev",
  "itch.io",
  "bandcamp.com",
  "linktr.ee",
  "bio.link",
  "beacons.ai",
];

export function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .split("/")[0]!
    .split(":")[0]!
    .toLowerCase();
}

/** The rules that need no model and no network. */
export function mechanicalReason(url: string): PricedReason | null {
  const host = hostOf(url);
  if (SHORTENERS.has(host)) return "shortener";
  // Suffix match with a dot in front, so "notgithub.io" is not "github.io"
  // and the bare apex of a host on the list is caught as well.
  if (HOSTED_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))) return "hosted";
  return null;
}

/** What to say when someone lands on the board holding one of these. */
export function pricedCopy(reason: PricedReason | null): { title: string; detail: string } {
  switch (reason) {
    case "shortener":
      return {
        title: "Shortened links go to the board.",
        detail:
          "A shortened address hides where it goes, so it can't be checked before it's shown. Bid for a place and it runs with its price attached.",
      };
    case "hosted":
      return {
        title: "This one goes to the board.",
        detail:
          "Sites on a builder's subdomain are almost always the owner submitting their own, so they buy a place rather than being given one. Your address is filled in.",
      };
    case "commerce":
      return {
        title: "Shops go to the board.",
        detail:
          "Somewhere selling something is advertising, and advertising pays for its place here. Name your price and it runs with the price shown.",
      };
    case "personal":
    case "blog":
      return {
        title: "This one goes to the board.",
        detail:
          "A personal site or blog is usually its owner submitting it, so it buys a place rather than being given one. Your address is filled in.",
      };
    default:
      return {
        title: "This one goes to the board.",
        detail: "Bid to place it, and outbid whoever is above you to move up.",
      };
  }
}
