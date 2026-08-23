/**
 * The six digits people give each other.
 *
 * A PIN in the BlackBerry Messenger sense: not a password, not a passcode, and
 * not a thing that unlocks anything. It is a short public name for an account,
 * the number you read out so someone can find you when they do not know your
 * email and you would rather they did not.
 *
 * Because it is public, it can be derived rather than stored, and that is what
 * this does -- six digits from the account id, the same six every time, on
 * every device, forever. Nothing is written and nothing new is fetched.
 *
 * ---------------------------------------------------------------------------
 * What a derived PIN cannot do, stated plainly
 *
 * Two things, and both want a column that the live `profiles` table does not
 * have (measured: no `pin`, and no `gen_profile_pin` function -- the copy in
 * the repo's generated types describes the other database).
 *
 *   Finding someone BY their PIN. Going from an account to its digits is this
 *   function; going the other way means asking the server, and the server
 *   cannot search a number it does not keep. That needs the PIN stored and
 *   indexed, plus a lookup that returns a profile and nothing else.
 *
 *   Guaranteeing two people never share one. Six digits is a million of them,
 *   and by the birthday bound a collision becomes likelier than not at around
 *   1,200 accounts. At today's 167 it is roughly a one-in-seventy chance that
 *   any pair anywhere collides. Uniqueness is a database constraint, and this
 *   has no database to constrain.
 *
 * Both are fixed by the same change, and it is deliberately a change this
 * survives: seed the new column from THIS function and nobody's PIN moves. A
 * PIN that changed under someone after they had given it out would be worse
 * than never having shown one.
 */

/**
 * FNV-1a, 32-bit.
 *
 * Chosen for being small, exactly specified and identical everywhere, which
 * is the whole requirement -- the same account must produce the same digits
 * in every browser and every future version of this file. Not a cryptographic
 * hash, and it does not need to be: the input is not a secret being protected
 * and the output is meant to be given away.
 */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    // The FNV prime, by shift-and-add, because a plain multiply overflows a
    // double's integer range and quietly stops being FNV.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/** The six digits for an account, zero-padded. Empty for no account. */
export function pinFor(accountId: string | null | undefined): string {
  const id = (accountId ?? "").trim().toLowerCase();
  if (!id) return "";
  return String(fnv1a(id) % 1_000_000).padStart(6, "0");
}

/**
 * Grouped in threes for reading aloud.
 *
 * Six unbroken digits are read as one number and misremembered as one; three
 * and three is how a person says it and how the other person writes it down.
 * The grouping is presentation only -- what gets copied is the bare digits,
 * because that is what someone will paste into a search box.
 */
export function groupPin(pin: string): string {
  return pin.length === 6 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin;
}
