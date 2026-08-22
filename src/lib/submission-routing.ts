/**
 * Where the classifier decided a submitted link belongs, and what to say
 * about it.
 *
 * The classify-submission edge function is the judge -- it normalises the
 * URL, refuses unsafe ones, measures embeddability, asks Grok what the page
 * actually is, and writes the row. These are the answers it can give back.
 */
export type SubmissionDestination = "stumble" | "reader" | "learn" | "tv" | "boost_only" | "none";

export type RoutingCopy = {
  /** Headline shown as the result. */
  title: string;
  /** One supporting line, or empty when no detail should be shown. */
  detail: string;
  /** Drives the accent: added somewhere, sent to the auction, or not added. */
  tone: "positive" | "neutral" | "soft-negative";
};

/**
 * Nothing is ever framed as rejected. A link that isn't right for the queue
 * has a different home, not a failure -- that framing is deliberate and
 * carried over from the original.
 *
 * `reader`, `learn` and `tv` name what the classifier thinks a link IS. They
 * are not a holding pen, and they used to read like one: "Added, but not to
 * the queue... filed separately" described a site that had been set aside,
 * when the row had in fact gone live and was already in the rotation. Nothing
 * is held for review -- sites.status defaults to 'live', and of 966
 * submissions over ninety days, 965 went live and none were pending -- so a
 * message implying otherwise was telling people to wait for something that
 * had already happened.
 *
 * `none` is the one genuinely negative outcome -- malware, spam, illegal --
 * and it stays vague on purpose. Explaining exactly which rule caught a link
 * is a map for getting the next one past it.
 */
export function routingCopy(destination: SubmissionDestination | undefined): RoutingCopy {
  switch (destination) {
    case "stumble":
      return {
        title: "It's in.",
        detail: "People will land on it as they go.",
        tone: "positive",
      };
    case "reader":
    case "learn":
    case "tv":
      return {
        title: "It's in.",
        detail: "People will land on it as they go.",
        tone: "positive",
      };
    case "boost_only":
      // The destination keeps its stored name -- it is written to a database
      // column and read by an edge function. What changed is what it means to
      // the person reading it: not a lesser tier, an auction they can win.
      return {
        title: "This one goes to the board.",
        detail: "Bid to place it, and outbid whoever is above you to move up.",
        tone: "neutral",
      };
    case "none":
    default:
      return {
        title: "Couldn't add this one.",
        detail: "",
        tone: "soft-negative",
      };
  }
}
