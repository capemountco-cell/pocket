import { useCallback, useEffect, useRef, useState } from "react";
import { fetchQueue, recordServe, resetHistory, type DiscoverySite } from "@/lib/discovery";

// Fetch this many candidates at a time. Large enough that a run of taps never
// waits on the network, small enough that a device doesn't burn through the
// catalogue in one request.
const QUEUE_SIZE = 25;

// Refill once the buffer gets this short, so the fetch overlaps with reading
// rather than interrupting it.
const REFILL_AT = 3;

export type DeckStatus = "loading" | "ready" | "empty" | "error";

/**
 * The discovery loop: hold a buffer of candidates, hand out one at a time, and
 * tell the server what has been served so it stops offering it.
 *
 * The server filters what this device disliked, blocked or already saw, so an
 * exhausted catalogue comes back as an empty queue. That is a normal end
 * state, not a failure — the caller is offered a restart rather than being
 * left on a blank screen.
 */
export function useDiscoveryDeck(deviceId: string | null) {
  const [site, setSite] = useState<DiscoverySite | null>(null);
  const [status, setStatus] = useState<DeckStatus>("loading");
  const queue = useRef<DiscoverySite[]>([]);
  // A refill in flight must not be started twice by two quick taps.
  const filling = useRef(false);

  const serve = useCallback((id: string, next: DiscoverySite) => {
    setSite(next);
    // Fire-and-forget: a serve that fails to record costs a repeat, which is
    // not worth blocking the screen on.
    void recordServe(id, next.id);
  }, []);

  const refill = useCallback(
    async (id: string, opts: { serveNext: boolean }) => {
      if (filling.current) return;
      filling.current = true;
      try {
        // Deliberately no auto-restart: reaching the end of the catalogue is
        // a real state this product wants to show. Silently re-serving seen
        // sites would turn a finite, edited collection into the endless feed
        // it is explicitly not.
        const batch = await fetchQueue(id, QUEUE_SIZE);
        queue.current = batch;

        if (batch.length === 0) {
          // A top-up that comes back empty is not yet an end state: the site
          // on screen is still perfectly good, and saying "you've seen
          // everything" over it would be wrong. The end only arrives when
          // someone asks for the next site and there isn't one.
          if (!opts.serveNext) return;
          setSite(null);
          setStatus("empty");
          return;
        }

        setStatus("ready");
        if (opts.serveNext) {
          const next = queue.current.shift();
          if (next) serve(id, next);
        }
      } catch {
        setStatus("error");
      } finally {
        filling.current = false;
      }
    },
    [serve],
  );

  useEffect(() => {
    if (!deviceId) return;
    void refill(deviceId, { serveNext: true });
  }, [deviceId, refill]);

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
