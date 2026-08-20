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
  /** Drives the accent: added somewhere, sent to the boost path, or not added. */
  tone: "positive" | "neutral" | "soft-negative";
};

/**
 * Nothing is ever framed as rejected. A link that isn't right for the queue
 * has a different home, not a failure -- that framing is deliberate and
 * carried over from the original.
 *
 * `reader`, `learn` and `tv` are surfaces this app does not have. The row is
 * still written with that destination, so the copy says the link was accepted
 * and filed rather than naming a place a person cannot go and look.
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
        title: "Added, but not to the queue.",
        detail: "It didn't fit the full-screen format, so it's filed separately.",
        tone: "positive",
      };
    case "boost_only":
      return {
        title: "This one's boost-only.",
        detail: "Boosting is how a link like this gets distribution.",
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
