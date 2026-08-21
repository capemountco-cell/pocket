import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  describeFailure,
  adminDeleteSite,
  adminSetSiteStatus,
  adminSites,
  adminSpamSites,
} from "@/lib/admin";
import type { AdminSite } from "@/lib/admin";
import { useAsync } from "@/components/admin/useAsync";
import {
  Btn,
  Chip,
  FAINT,
  INK,
  LINE,
  MUTED,
  Note,
  Panel,
  Row,
  SURFACE,
} from "@/components/admin/ui";

type Mode = "all" | "flagged";

const PAGE = 60;

/**
 * The catalogue itself: two thousand sites, searchable, with the two actions
 * that actually change anything.
 *
 * The status control is built from the statuses the database is really using
 * rather than from a list written here. Nothing in this repo defines what
 * values `sites.status` accepts -- the migration that created it lives in the
 * project this database was built from -- and a hard-coded "hidden" that the
 * schema has never heard of would look like a working button and quietly do
 * nothing. So: the options are the distinct values in the rows themselves,
 * plus a way to type one that hasn't appeared yet.
 */
export function SitesPanel({ token }: { token: string }) {
  const [mode, setMode] = useState<Mode>("all");
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});

  // Typing runs a query against two thousand rows, so it waits for a pause.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed), 300);
    return () => clearTimeout(timer);
  }, [typed]);

  useEffect(() => setLimit(PAGE), [search, status, mode]);

  const { data, error, loading, reload } = useAsync<AdminSite[]>(
    `${token}:${mode}:${search}:${status}`,
    () => (mode === "flagged" ? adminSpamSites(token) : adminSites(token, search, status)),
  );

  // Stable across renders so the status list below is not recomputed on
  // every keystroke while a load is in flight.
  const rows = useMemo(() => data ?? [], [data]);

  // "Deleted" is a local mark, not a filter on the fetch: the row stays
  // visible as a struck-through record until the next load, so an accidental
  // delete is visible rather than simply gone.
  const knownStatuses = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) if (row.status) seen.add(row.status);
    return [...seen].sort();
  }, [rows]);

  const setRowStatus = async (id: string, next: string) => {
    setBusy(id);
    setFailure(null);
    try {
      await adminSetSiteStatus(token, id, next);
      setOverrides((prev) => ({ ...prev, [id]: next }));
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (row: AdminSite) => {
    if (!confirm(`Delete ${hostOf(row.url)} from the catalogue? This cannot be undone.`)) return;
    setBusy(row.id);
    setFailure(null);
    try {
      await adminDeleteSite(token, row.id);
      setOverrides((prev) => ({ ...prev, [row.id]: null }));
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <Panel
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn tone={mode === "all" ? "primary" : "quiet"} onClick={() => setMode("all")}>
              All
            </Btn>
            <Btn tone={mode === "flagged" ? "primary" : "quiet"} onClick={() => setMode("flagged")}>
              Flagged
            </Btn>
            <Btn onClick={reload}>Refresh</Btn>
          </div>
        }
        title={mode === "flagged" ? "Reported by readers" : "Catalogue"}
      >
        {mode === "all" ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Search title or address"
              type="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search the catalogue"
              style={{
                flex: "1 1 auto",
                minWidth: 0,
                boxSizing: "border-box",
                padding: "10px 13px",
                borderRadius: 11,
                border: `1px solid ${LINE}`,
                background: SURFACE,
                color: INK,
                fontFamily: "inherit",
                fontSize: 15,
                outline: "none",
              }}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
              style={{
                flex: "0 0 auto",
                padding: "10px 11px",
                borderRadius: 11,
                border: `1px solid ${LINE}`,
                background: SURFACE,
                color: INK,
                fontFamily: "inherit",
                fontSize: 14,
              }}
            >
              <option value="all">Any status</option>
              {knownStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {failure ? <Note text={failure} tone="danger" /> : null}
        {error ? (
          <Note text={error} tone="danger" />
        ) : loading && !data ? (
          <Note text="Reading…" />
        ) : rows.length === 0 ? (
          <Note text={search ? `Nothing matching “${search}”.` : "No sites."} />
        ) : (
          <>
            <p style={{ margin: "0 0 10px", fontSize: 12.5, color: FAINT }}>
              {rows.length.toLocaleString()} {rows.length === 1 ? "site" : "sites"}
              {rows.length > limit ? ` · showing ${limit}` : ""}
            </p>
            {rows.slice(0, limit).map((row) => (
              <SiteRow
                key={row.id}
                row={row}
                statuses={knownStatuses}
                override={row.id in overrides ? (overrides[row.id] ?? null) : undefined}
                busy={busy === row.id}
                onStatus={(next) => void setRowStatus(row.id, next)}
                onDelete={() => void remove(row)}
              />
            ))}
            {rows.length > limit ? (
              <div style={{ marginTop: 10 }}>
                <Btn onClick={() => setLimit((n) => n + PAGE)}>Show more</Btn>
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}

function SiteRow({
  row,
  statuses,
  override,
  busy,
  onStatus,
  onDelete,
}: {
  row: AdminSite;
  statuses: string[];
  /** `undefined` untouched, a string for a new status, `null` for deleted. */
  override: string | null | undefined;
  busy: boolean;
  onStatus: (next: string) => void;
  onDelete: () => void;
}) {
  const deleted = override === null;
  const status = typeof override === "string" ? override : row.status;

  const choose = (value: string) => {
    if (value === "__other") {
      const next = prompt("Set status to:", status ?? "");
      if (next && next.trim() && next.trim() !== status) onStatus(next.trim());
      return;
    }
    if (value !== status) onStatus(value);
  };

  return (
    <Row>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: INK,
              textDecoration: deleted ? "line-through" : "none",
              opacity: deleted ? 0.5 : 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.title || hostOf(row.url)}
          </p>
          <a
            href={row.url}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 3,
              maxWidth: "100%",
              fontSize: 13,
              color: MUTED,
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {hostOf(row.url)}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
        {deleted ? <Chip tone="warn">deleted</Chip> : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        <Chip>{`${row.like_count ?? 0} up`}</Chip>
        <Chip>{`${row.dislike_count ?? 0} down`}</Chip>
        {(row.spam_report_count ?? 0) > 0 ? (
          <Chip tone="warn">{`${row.spam_report_count} reports`}</Chip>
        ) : null}
        {row.category ? <Chip>{row.category}</Chip> : null}
        {row.is_adult ? <Chip tone="warn">adult</Chip> : null}
        {row.is_promotional ? <Chip tone="warn">promotional</Chip> : null}
        {row.boosted ? <Chip>boosted</Chip> : null}
        {row.embeddable === false ? <Chip tone="warn">no embed</Chip> : null}
      </div>

      {row.review_flags ? (
        <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.45, color: FAINT }}>
          {row.review_flags}
        </p>
      ) : null}

      {deleted ? null : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <select
            value={status ?? ""}
            onChange={(e) => choose(e.target.value)}
            disabled={busy}
            aria-label={`Status of ${hostOf(row.url)}`}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${LINE}`,
              background: "transparent",
              color: INK,
              fontFamily: "inherit",
              fontSize: 13.5,
            }}
          >
            {(statuses.includes(status ?? "") ? statuses : [...statuses, status ?? ""]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="__other">other…</option>
          </select>
          <Btn tone="danger" onClick={onDelete} disabled={busy}>
            {busy ? "Working…" : "Delete"}
          </Btn>
        </div>
      )}
    </Row>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
