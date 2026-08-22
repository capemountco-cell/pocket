import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The screen's old address.
 *
 * It was called the collection, then History, and the URL was the last thing
 * still saying the old name. Renaming it left every link anyone had already
 * made pointing at nothing, so this stays: it holds the old path and sends it
 * to the new one before anything renders.
 */
export const Route = createFileRoute("/saved")({
  beforeLoad: () => {
    throw redirect({ to: "/history", replace: true });
  },
});
