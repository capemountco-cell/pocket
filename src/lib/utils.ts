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
