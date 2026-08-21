import type { Json } from "@/integrations/supabase/types";
import { FAINT, INK, LINE, MUTED, SURFACE } from "@/components/admin/ui";

/**
 * Renders whatever a routine actually returned.
 *
 * Several of the console's reads come back as bare `Json`, and the migrations
 * that define those shapes are not in this repo -- they live in the project
 * the database was built from. So rather than hard-code a guess at the key
 * names and quietly render a zero under a heading I invented, this walks the
 * response and shows what is there.
 *
 * That is not a placeholder for a "real" dashboard. It is the honest version:
 * a number on this screen is always a number the database sent, under the
 * name the database gave it. If a routine grows a field tomorrow it appears
 * here tomorrow, with no code change and no chance of it silently going
 * missing.
 */
export function Readout({ value, depth = 0 }: { value: Json; depth?: number }) {
  if (value === null || value === undefined) return <Bare text="—" />;

  if (Array.isArray(value)) {
    if (value.length === 0) return <Bare text="None" />;
    // A list of records is a table; a list of plain values is a sentence.
    if (value.every((v) => typeof v !== "object" || v === null)) {
      return <Bare text={value.map((v) => scalarText(v)).join(" · ")} />;
    }
    return (
      <div>
        {value.slice(0, 40).map((entry, i) => (
          <div
            key={i}
            style={{
              padding: "11px 13px",
              marginBottom: 7,
              borderRadius: 11,
              background: SURFACE,
              border: `1px solid ${LINE}`,
            }}
          >
            <Readout value={entry} depth={depth + 1} />
          </div>
        ))}
        {value.length > 40 ? <Bare text={`…and ${value.length - 40} more`} /> : null}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined) as Array<
      [string, Json]
    >;
    if (entries.length === 0) return <Bare text="Nothing recorded" />;

    const flat = entries.filter(([, v]) => typeof v !== "object" || v === null);
    const nested = entries.filter(([, v]) => typeof v === "object" && v !== null);

    return (
      <div>
        {flat.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8,
              marginBottom: nested.length > 0 ? 16 : 0,
            }}
          >
            {flat.map(([key, v]) => (
              <Tile key={key} label={humanise(key)} value={scalarText(v)} />
            ))}
          </div>
        ) : null}

        {/* Three levels is as deep as any of these responses has needed to be
            read. Past that the raw shape is more useful than more chrome. */}
        {nested.map(([key, v]) =>
          depth >= 2 ? (
            <Tile key={key} label={humanise(key)} value={JSON.stringify(v)} />
          ) : (
            <div key={key} style={{ marginBottom: 14 }}>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: FAINT,
                }}
              >
                {humanise(key)}
              </h3>
              <Readout value={v} depth={depth + 1} />
            </div>
          ),
        )}
      </div>
    );
  }

  return <Tile label="" value={scalarText(value)} />;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "11px 13px",
        borderRadius: 12,
        background: SURFACE,
        border: `1px solid ${LINE}`,
        minWidth: 0,
      }}
    >
      {label ? (
        <span
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 650,
            letterSpacing: "0.04em",
            color: FAINT,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        style={{
          display: "block",
          marginTop: label ? 3 : 0,
          fontSize: 19,
          fontWeight: 750,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          color: INK,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function Bare({ text }: { text: string }) {
  return <p style={{ margin: "6px 0", fontSize: 14, color: MUTED }}>{text}</p>;
}

/** `total_sites` reads as a heading; `totalSites` does not. */
function humanise(key: string): string {
  const words = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/;

function scalarText(value: Json | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") {
    // A timestamp is the one string worth reformatting: the raw ISO form is
    // four fields of noise around the two that matter.
    if (ISO_DATE.test(value)) {
      const at = new Date(value);
      if (!Number.isNaN(at.getTime())) {
        return at.toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }
    return value;
  }
  return JSON.stringify(value);
}
