import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchQueue,
  fetchSiteById,
  recordServe,
  resetHistory,
  type DiscoverySite,
} from "@/lib/discovery";
import { isSupabaseConfigured } from "@/integrations/supabase/client";

// Fetch this many candidates at a time. Large enough that a run of taps never
// waits on the network, small enough that a device doesn't burn through the
// catalogue in one request.
const QUEUE_SIZE = 25;

// Refill once the buffer gets this short, so the fetch overlaps with reading
// rather than interrupting it.
const REFILL_AT = 3;

// How many recent ids ride along with a top-up request. The server's own
// memory is permanent, so this only has to cover the window it has not been
// told about yet -- a few batches is far more than that, and keeps the request
// from growing without bound over a long sitting.
const RECENT_CAP = 150;

export type DeckStatus = "loading" | "ready" | "empty" | "error" | "unconfigured";

/**
 * The discovery loop: hold a buffer of candidates, hand out one at a time, and
 * tell the server what has been served so it stops offering it.
 *
 * Nothing is ever shown twice. That is the product, not a nicety, and it is
 * held by two things rather than one:
 *
 * `seen_sites` is the permanent record, written by record_discovery, and it
 * survives closing the app. But a serve is recorded fire-and-forget while the
 * reader keeps tapping, so a top-up fired at REFILL_AT can be answered from a
 * record that is seconds behind -- measured at 8 repeats in a batch of 25.
 * Every top-up therefore carries the ids this session already knows about, and
 * the buffer is filtered against them again on arrival. The second pass is not
 * redundant: it is what covers a serve whose record never landed at all.
 *
 * The server filters what this device disliked, blocked or already saw, so an
 * exhausted catalogue comes back as an empty queue. That is a normal end
 * state, not a failure -- the caller is offered a restart rather than being
 * left on a blank screen.
 */
export function useDiscoveryDeck(deviceId: string | null, requestedSiteId?: string | null) {
  const [site, setSite] = useState<DiscoverySite | null>(null);
  const [status, setStatus] = useState<DeckStatus>("loading");
  const queue = useRef<DiscoverySite[]>([]);
  // Everything handed out this session, newest last. The server is told about
  // each of these, but not in time to help the request already in flight.
  const shown = useRef<string[]>([]);
  const shownSet = useRef<Set<string>>(new Set());
  // A refill in flight must not be started twice by two quick taps.
  const filling = useRef(false);
  // A tap that arrives mid-refill still needs a site when that refill lands.
  const owed = useRef(false);

  const remember = (id: string) => {
    if (shownSet.current.has(id)) return;
    shownSet.current.add(id);
    shown.current.push(id);
    if (shown.current.length > RECENT_CAP * 2) {
      const dropped = shown.current.splice(0, shown.current.length - RECENT_CAP);
      // The set keeps only what the array still carries, so it cannot grow
      // without bound either -- the permanent record is the server's job.
      for (const old of dropped) shownSet.current.delete(old);
    }
  };

  const serve = useCallback((id: string, next: DiscoverySite) => {
    remember(next.id);
    setSite(next);
    // Fire-and-forget: a serve that fails to record must not block the screen.
    // It costs nothing here either, because `shown` has already caught it.
    void recordServe(id, next.id);
  }, []);

  const refill = useCallback(
    async (id: string, opts: { serveNext: boolean }) => {
      if (filling.current) {
        // Don't drop the request -- remember that someone is waiting on a
        // site, so the fill already running hands one over when it lands.
        if (opts.serveNext) owed.current = true;
        return;
      }
      filling.current = true;
      if (opts.serveNext) owed.current = true;
      try {
        // Deliberately no auto-restart: reaching the end of the catalogue is
        // a real state this product wants to show. Silently re-serving seen
        // sites would turn a finite, edited collection into the endless feed
        // it is explicitly not.
        const held = queue.current.map((s) => s.id);
        const exclude = [...shown.current.slice(-RECENT_CAP), ...held];
        const batch = await fetchQueue(id, QUEUE_SIZE, exclude);

        // Appended, not assigned. The old code overwrote the buffer, throwing
        // away the candidates still in it. Filtered again on the way in, which
        // is what catches a serve the server was never told about.
        const known = new Set([...shownSet.current, ...held]);
        queue.current = [...queue.current, ...batch.filter((s) => !known.has(s.id))];

        if (queue.current.length === 0) {
          // A top-up that comes back empty is not yet an end state: the site
          // on screen is still perfectly good, and saying "you've seen
          // everything" over it would be wrong. The end only arrives when
          // someone asks for the next site and there isn't one.
          if (!owed.current) return;
          owed.current = false;
          setSite(null);
          setStatus("empty");
          return;
        }

        setStatus("ready");
        if (owed.current) {
          owed.current = false;
          const next = queue.current.shift();
          if (next) serve(id, next);
        }
      } catch {
        owed.current = false;
        setStatus("error");
      } finally {
        filling.current = false;
      }
    },
    [serve],
  );

  useEffect(() => {
    if (!deviceId) return;
    if (!isSupabaseConfigured) {
      setStatus("unconfigured");
      return;
    }

    // Arriving with a specific site in mind (from the collection) must not race
    // the queue's own first serve -- whichever landed last used to win, so the
    // requested site was usually overwritten by a random one. Serving it here,
    // before the buffer fills, removes the race entirely.
    if (requestedSiteId) {
      void fetchSiteById(requestedSiteId).then((requested) => {
        if (requested) {
          serve(deviceId, requested);
          setStatus("ready");
          void refill(deviceId, { serveNext: false });
        } else {
          void refill(deviceId, { serveNext: true });
        }
      });
      return;
    }

    void refill(deviceId, { serveNext: true });
  }, [deviceId, refill, serve, requestedSiteId]);

  /** Advance to the next site. */
  const discover = useCallback(() => {
    if (!deviceId) return;
    const next = queue.current.shift();
    if (next) {
      serve(deviceId, next);
      if (queue.current.length <= REFILL_AT) void refill(deviceId, { serveNext: false });
      return;
    }
    setStatus("loading");
    void refill(deviceId, { serveNext: true });
  }, [deviceId, refill, serve]);

  /** Jump straight to a known site (from the collection, say). */
  const showSite = useCallback((next: DiscoverySite) => {
    setSite(next);
    setStatus("ready");
  }, []);

  /** Clear this device's history and start the catalogue over. */
  const restart = useCallback(async () => {
    if (!deviceId) return;
    setStatus("loading");
    try {
      await resetHistory(deviceId);
      // The session's own memory goes with it, or the catalogue would come
      // round again everywhere except in this tab.
      queue.current = [];
      shown.current = [];
      shownSet.current = new Set();
      await refill(deviceId, { serveNext: true });
    } catch {
      setStatus("error");
    }
  }, [deviceId, refill]);

  /** Retry after a failed load. */
  const retry = useCallback(() => {
    if (!deviceId) return;
    setStatus("loading");
    void refill(deviceId, { serveNext: true });
  }, [deviceId, refill]);

  return { site, status, discover, showSite, restart, retry };
}
