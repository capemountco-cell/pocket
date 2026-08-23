import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shortens a description to fit a card without cutting mid-word.
 *
 * Cuts at the last space when that leaves most of the budget intact, and only
 * hard-cuts a single very long word. Whitespace is collapsed first, because a
 * blurb scraped from a page often carries the newlines of its markup.
 */
export function clampText(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * Put text on the clipboard, and say whether it actually landed.
 *
 * Clipboard access is refused outright in some embedded and insecure
 * contexts, so the caller is told what happened rather than being shown a
 * success toast on faith.
 */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the failure path */
  }
  return false;
}
