import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

export const DEVICE_COOKIE = "app_device_id";

// Two years. The point is to outlive the browser's own housekeeping, not to
// be precise -- anything under a few months puts us back where we started.
const TWO_YEARS_SECONDS = 60 * 60 * 24 * 730;

const UUID_LIKE = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Pin this device's identity somewhere the browser will not quietly bin.
 *
 * The identity is what makes "never show the same site twice" mean anything:
 * the whole no-repeat record hangs off it, so losing it silently restarts the
 * catalogue -- and because the queue is weighted by likes, a restart serves
 * the best-known sites again first. That reads exactly like the loop repeating
 * itself, which is the complaint.
 *
 * It was being lost. Of 2,090 devices seen over thirty days, 1,829 existed for
 * under an hour and only 36 lasted more than seven days. Seven is the number
 * that gives it away: Safari's tracking prevention clears script-writable
 * storage -- localStorage included, and cookies written from script with it --
 * after seven days without a first-party interaction, and iOS is where this
 * app lives.
 *
 * A cookie set from the server is not script-writable storage and is not on
 * that clock. So the id still lives in localStorage, and this hands the same
 * value back over the wire with a two-year expiry that the browser will
 * actually honour. The call is a POST, so no CDN can cache one visitor's
 * identity and serve it to the next.
 *
 * Precedence is deliberate: an id the client already has always wins. Minting
 * a fresh one here would throw away the history of every existing device the
 * first time this shipped, which is the bug, not the fix.
 */
export const anchorDevice = createServerFn({ method: "POST" })
  .validator((data: unknown): { id: string } => {
    const id = (data as { id?: unknown } | null)?.id;
    if (typeof id !== "string" || !UUID_LIKE.test(id)) {
      throw new Error("A device id must be a short opaque token.");
    }
    return { id };
  })
  .handler(({ data }): { id: string } => {
    const held = getCookie(DEVICE_COOKIE);
    // The client's id is authoritative. The cookie only fills the gap when the
    // client arrives with nothing, which the client checks for itself first.
    const id = data.id || held || "";
    if (id) {
      setCookie(DEVICE_COOKIE, id, {
        path: "/",
        maxAge: TWO_YEARS_SECONDS,
        sameSite: "lax",
        secure: true,
        // Readable by script on purpose: this is how a device whose
        // localStorage was cleared finds its own history again.
        httpOnly: false,
      });
    }
    return { id };
  });
