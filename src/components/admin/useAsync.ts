import { useCallback, useEffect, useRef, useState } from "react";
import { describeFailure } from "@/lib/admin";

export type Async<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

/**
 * One load, one error, one way to try again.
 *
 * `key` is what the load depends on -- a token, a search term, a filter --
 * flattened to a string. The work itself is held in a ref so that passing a
 * fresh closure every render doesn't re-run it, which is the usual way a
 * panel like this ends up hammering the database on every keystroke.
 *
 * A failed load keeps its message. The console's whole job is telling its
 * operator what the database said, so "couldn't load" is never enough.
 */
export function useAsync<T>(key: string, run: () => Promise<T>): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    runRef
      .current()
      .then((next) => {
        if (!live) return;
        setData(next);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        setError(describeFailure(cause));
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload };
}
