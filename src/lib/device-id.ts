const DEVICE_ID_KEY = "app_device_id_v1";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `d-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Anonymous, device-local identity. Returns null during SSR. */
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const next = createId();
    window.localStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return null;
  }
}
