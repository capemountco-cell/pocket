/**
 * A readable name for someone who has not given one.
 *
 * Comments come back signed with four hex characters of the commenter's device
 * id -- "fdd2". That is a fragment of a hash, not a name, and most of the
 * people who will ever comment here are signed out, so most of a thread would
 * be signed in gibberish.
 *
 * So the fragment is mapped to two words instead. Deterministic, which is what
 * makes it worth anything: the same person is the same name every time, on
 * every site, for as long as their device id lasts, so a thread reads as
 * several people talking rather than several hashes. Nothing is stored and
 * nothing is sent -- the database still holds only what it held before, and
 * this is a rendering of it.
 *
 * Done here rather than in SQL because it is presentation. The fragment is the
 * identity; this is what the identity looks like.
 *
 * 72 x 72 is 5,184 names against 65,536 possible fragments, so two people can
 * collide. That is a cosmetic collision on a pseudonym, not a mixed-up
 * identity: nothing in the app treats the name as a key, and `mine` -- which
 * decides whether a comment offers delete or report -- comes from the server,
 * never from this.
 */

const ADJECTIVES = [
  "amber",
  "ancient",
  "autumn",
  "bitter",
  "bold",
  "brave",
  "brief",
  "bright",
  "calm",
  "candid",
  "civil",
  "clear",
  "clever",
  "cobalt",
  "cold",
  "cosmic",
  "crisp",
  "curious",
  "damp",
  "dawn",
  "deep",
  "distant",
  "dry",
  "dusty",
  "eager",
  "early",
  "easy",
  "electric",
  "empty",
  "even",
  "faint",
  "fallen",
  "fierce",
  "final",
  "first",
  "frozen",
  "gentle",
  "gilded",
  "glad",
  "golden",
  "grand",
  "green",
  "hidden",
  "hollow",
  "humble",
  "idle",
  "indigo",
  "iron",
  "jade",
  "keen",
  "late",
  "level",
  "lilac",
  "little",
  "lively",
  "lone",
  "loud",
  "lucid",
  "mellow",
  "mild",
  "misty",
  "modest",
  "narrow",
  "noble",
  "odd",
  "olive",
  "open",
  "patient",
  "plain",
  "polite",
  "proud",
  "quiet",
];

const NOUNS = [
  "acorn",
  "alder",
  "anchor",
  "arbor",
  "aspen",
  "badger",
  "basin",
  "beacon",
  "birch",
  "bramble",
  "brook",
  "canyon",
  "cedar",
  "cinder",
  "cliff",
  "clover",
  "comet",
  "coral",
  "cove",
  "crane",
  "dune",
  "eagle",
  "ember",
  "falcon",
  "fern",
  "finch",
  "fjord",
  "forge",
  "gale",
  "garnet",
  "glade",
  "grove",
  "harbor",
  "hawk",
  "heron",
  "hollow",
  "isle",
  "juniper",
  "kestrel",
  "lantern",
  "lark",
  "ledge",
  "linden",
  "lupine",
  "marble",
  "meadow",
  "mesa",
  "moss",
  "otter",
  "owl",
  "pebble",
  "pine",
  "plover",
  "quarry",
  "quill",
  "raven",
  "reef",
  "ridge",
  "river",
  "sable",
  "sparrow",
  "spruce",
  "stone",
  "summit",
  "thicket",
  "thistle",
  "tundra",
  "vale",
  "willow",
  "wren",
  "yarrow",
  "zephyr",
];

/**
 * The name for a fragment, or the fragment itself if it is not one.
 *
 * Two words joined by a hyphen, which reads as a handle rather than as a
 * sentence and cannot be mistaken for someone's actual name.
 */
export function handleFor(author: string): string {
  const clean = author.trim().toLowerCase();
  // Anything that is not the short hex fragment is left alone: a signed-in
  // person's chosen name arrives through the same field, and renaming that
  // would be considerably worse than the problem being solved.
  if (!/^[0-9a-f]{1,8}$/.test(clean)) return author;

  const n = Number.parseInt(clean, 16);
  if (!Number.isFinite(n)) return author;

  // Two independent slices of the number, so neighbouring fragments do not
  // produce neighbouring names.
  // The modulo makes both indexes valid, but this project compiles with
  // noUncheckedIndexedAccess and a template literal will happily print the
  // word "undefined" rather than complain -- so the fallbacks are real.
  const adjective = ADJECTIVES[n % ADJECTIVES.length] ?? "quiet";
  const noun = NOUNS[Math.floor(n / ADJECTIVES.length) % NOUNS.length] ?? "otter";
  return `${adjective}-${noun}`;
}
