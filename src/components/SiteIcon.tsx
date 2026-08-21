import { useState } from "react";

/**
 * The small square beside a compact row.
 *
 * A site's favicon if one can be had, and the first letter of its domain if
 * not. The letter is not a placeholder waiting to be replaced -- plenty of
 * the catalogue has no usable icon at all, and a row is not allowed to look
 * unfinished because of that.
 *
 * Icons come from DuckDuckGo rather than Google's equivalent. Both are free
 * and keyless, and both learn which domains a person is looking at; this app
 * respects Do Not Track and ships no ad tooling, so handing that list to an
 * ad company would be the odd choice.
 */
export function SiteIcon({ domain, size = 36 }: { domain: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const letter = (domain.replace(/^www\./, "")[0] ?? "?").toUpperCase();

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
        borderRadius: 9,
        overflow: "hidden",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: "rgba(255,255,255,0.62)",
      }}
    >
      {failed ? (
        letter
      ) : (
        <img
          src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ display: "block", width: size, height: size, objectFit: "cover" }}
        />
      )}
    </span>
  );
}
