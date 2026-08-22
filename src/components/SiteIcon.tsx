import { useState } from "react";

/**
 * The small square beside a compact row.
 *
 * A site's icon if it has one, and the first letter of its domain if not. The
 * letter is not a placeholder waiting to be replaced -- a third of the
 * catalogue has no usable icon at all, and a row is not allowed to look
 * unfinished because of that.
 *
 * Which of the two to draw is decided by the catalogue, not by whether an
 * image request succeeds. Asking an icon service for a domain it has never
 * seen does not fail: DuckDuckGo answers a miss with HTTP 404 carrying a
 * decodable 48x48 grey chevron, and a browser reports that as a successful
 * load -- `onError` never fires, so the fallback never ran and roughly one row
 * in three drew the grey chevron instead of its letter. The status code is
 * unreadable from here too: the service sends no CORS header, so `fetch` is
 * blocked and only `<img>` works. Nor is the shape a reliable tell -- four of
 * eighty real icons sampled were also 48x48 PNGs, codepen.io among them.
 *
 * So the answer is resolved once, server-side, into `sites.favicon_url`, and
 * a null there means "looked, found nothing". Those rows draw their letter
 * immediately and issue no request at all, which is also the faster path.
 *
 * `onError` is still wired, for an icon that stops being served after it was
 * resolved.
 */
export function SiteIcon({
  domain,
  icon,
  size = 44,
}: {
  domain: string;
  /** Resolved icon address, or null when the catalogue found none. */
  icon: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const letter = (domain.replace(/^www\./, "")[0] ?? "?").toUpperCase();
  const showLetter = icon === null || failed;

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        flex: "0 0 auto",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        overflow: "hidden",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: "rgba(255,255,255,0.62)",
      }}
    >
      {showLetter ? (
        letter
      ) : (
        <img
          src={icon}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{ display: "block", width: size, height: size, objectFit: "cover" }}
        />
      )}
    </span>
  );
}
