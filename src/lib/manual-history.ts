/**
 * Links you put in your own history by hand.
 *
 * Saving a site from the discovery loop writes a row against a catalogue id,
 * because there is a catalogue row to point at. A link typed in has no such
 * row, and the honest options were to invent one -- which would publish it to
 * everyone -- or to keep it on the device. It stays on the device.
 *
 * So these are yours alone: they are never submitted, never reviewed, never
 * shown to anyone else, and they do not survive a cleared browser. That is a
 * real limitation and the screen says so rather than pretending otherwise.
 *
 * They are shown alongside saved sites because from where the reader stands
 * they are the same thing -- a link they wanted to keep -- and splitting them
 * into two lists would be filing rather than remembering.
 */

const KEY = "app_manual_history_v1";

// Enough that nobody sensible hits it, small enough that the list stays a
// single synchronous read.
const CAP = 200;

export type ManualEntry = {
  /** Prefixed so it can never collide with a catalogue id. */
  id: string;
  url: string;
  domain: string;
  title: string;
  addedAt: string;
};

function read(): ManualEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function isEntry(value: unknown): value is ManualEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["url"] === "string" &&
    typeof v["domain"] === "string" &&
    typeof v["title"] === "string" &&
    typeof v["addedAt"] === "string"
  );
}

function write(entries: ManualEntry[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, CAP)));
  } catch {
    // Storage full or denied. The entry is lost, and the caller says so.
  }
}

export function manualEntries(): ManualEntry[] {
  return read();
}

/** Newest first, and a repeat of an address you already have moves to the top
 *  rather than appearing twice. */
export function addManualEntry(entry: Omit<ManualEntry, "id" | "addedAt">): ManualEntry {
  const id = `manual:${entry.url}`;
  const next: ManualEntry = { ...entry, id, addedAt: new Date().toISOString() };
  write([next, ...read().filter((e) => e.id !== id)]);
  return next;
}

export function removeManualEntry(id: string): void {
  write(read().filter((e) => e.id !== id));
}

export function clearManualEntries(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** What someone typed, repaired into an address if it can be. */
export function tidyUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
