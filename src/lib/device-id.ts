import { anchorDevice, DEVICE_COOKIE } from "@/lib/device-anchor";

const DEVICE_ID_KEY = "app_device_id_v1";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `d-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function readLocal(): string | null {
  try {
    return window.localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

function readCookie(): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=([^;]+)`));
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

// Only ever once per page: the anchor is a network call, and every sheet and
// screen in the app asks for the device id.
let anchored = false;

/**
 * Anonymous, device-local identity. Returns null during SSR.
 *
 * Kept in two places, because one was not surviving. localStorage is the
 * primary and always wins when it has a value -- it is where every existing
 * device's id already lives, and preferring anything else would discard the
 * history this is meant to protect. The cookie is the understudy: script
 * storage gets cleared after seven days without a first-party interaction on
 * iOS, and the id has to still be findable when it does.
 *
 * The cookie is written here so it exists immediately, and then re-issued by
 * the server (see device-anchor.ts) with an expiry the browser will honour --
 * a cookie written from script is on the same seven-day clock as the storage
 * it is standing in for, so this write alone would not be enough.
 */
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;

  const id = readLocal() ?? readCookie() ?? createId();

  try {
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // A private window keeps the cookie and the session; nothing else to do.
  }
  try {
    document.cookie = `${DEVICE_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=63072000; samesite=lax${
      window.location.protocol === "https:" ? "; secure" : ""
    }`;
  } catch {
    // Cookies disabled. localStorage alone still carries the day-to-day case.
  }

  if (!anchored) {
    anchored = true;
    // Fire-and-forget. A device that cannot reach the server has bigger
    // problems than an expiry date, and the id above is already usable.
    void anchorDevice({ data: { id } }).catch(() => {
      anchored = false;
    });
  }

  return id;
}
