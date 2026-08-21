import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  describeFailure,
  adminApprove,
  adminPending,
  adminReject,
  adminSubmissions,
} from "@/lib/admin";
import type { AdminSubmission } from "@/lib/admin";
import { useAsync } from "@/components/admin/useAsync";
import { Btn, Chip, FAINT, INK, MUTED, Note, Panel, Row } from "@/components/admin/ui";

type Scope = "pending" | "all";

/**
 * What people have sent in, and what the classifier made of it.
 *
 * A submission is not just a link waiting for a yes: it arrives already
 * judged -- a destination, a verdict, a reason -- and the operator's job is
 * usually to agree or disagree with that judgement rather than to form one
 * from scratch. So the machine's reasoning is shown next to the link, not
 * hidden behind it.
 *
 * A decision removes the row immediately rather than waiting for a refetch.
 * The routine has already returned by then; making someone watch a list
 * reload to learn that the button they pressed worked is how a queue of forty
 * becomes unusable.
 */
export function QueuePanel({ token }: { token: string }) {
  const [scope, setScope] = useState<Scope>("pending");
  const [decided, setDecided] = useState<Record<string, "approved" | "rejected">>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync<AdminSubmission[]>(`${token}:${scope}`, () =>
    scope === "pending" ? adminPending(token) : adminSubmissions(token),
  );

  const decide = async (id: string, verdict: "approved" | "rejected") => {
    setBusy(id);
    setFailure(null);
    try {
      if (verdict === "approved") await adminApprove(token, id);
      else await adminReject(token, id);
      setDecided((prev) => ({ ...prev, [id]: verdict }));
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setBusy(null);
    }
  };

  const rows = (data ?? []).filter((row) => !(scope === "pending" && decided[row.id]));

  return (
    <div>
      <Panel
        title={scope === "pending" ? "Waiting on a decision" : "Everything submitted"}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn
              tone={scope === "pending" ? "primary" : "quiet"}
              onClick={() => setScope("pending")}
            >
              Pending
            </Btn>
            <Btn tone={scope === "all" ? "primary" : "quiet"} onClick={() => setScope("all")}>
              All
            </Btn>
            <Btn onClick={reload}>Refresh</Btn>
          </div>
        }
      >
        {failure ? <Note text={failure} tone="danger" /> : null}
        {error ? (
          <Note text={error} tone="danger" />
        ) : loading && !data ? (
          <Note text="Reading…" />
        ) : rows.length === 0 ? (
          <Note text={scope === "pending" ? "Nothing waiting." : "Nothing submitted yet."} />
        ) : (
          rows.map((row) => (
            <SubmissionRow
              key={row.id}
              row={row}
              busy={busy === row.id}
              decided={decided[row.id] ?? null}
              onApprove={() => void decide(row.id, "approved")}
              onReject={() => void decide(row.id, "rejected")}
            />
          ))
        )}
      </Panel>
    </div>
  );
}

function SubmissionRow({
  row,
  busy,
  decided,
  onApprove,
  onReject,
}: {
  row: AdminSubmission;
  busy: boolean;
  decided: "approved" | "rejected" | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  // The classifier's columns are read defensively: this console talks to a
  // database whose generated types are a version ahead of it, so a field the
  // type promises can be absent at runtime.
  const destination = row.destination ?? null;
  const verdict = row.verdict ?? null;
  const why = row.classification_reason ?? row.reason ?? null;
  const status = row.moderation_status ?? null;

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
            {row.url}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
        {decided ? <Chip>{decided}</Chip> : status ? <Chip>{status}</Chip> : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {destination ? <Chip>{destination.replace(/_/g, " ")}</Chip> : null}
        {verdict ? <Chip>{verdict}</Chip> : null}
        {row.category ? <Chip>{row.category}</Chip> : null}
        {row.is_embeddable === false ? <Chip tone="warn">no embed</Chip> : null}
        {row.boosted ? <Chip>boosted</Chip> : null}
        {row.created_at ? <Chip>{new Date(row.created_at).toLocaleDateString()}</Chip> : null}
      </div>

      {why ? (
        <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.45, color: FAINT }}>{why}</p>
      ) : null}

      {decided ? null : (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn tone="primary" onClick={onApprove} disabled={busy}>
            {busy ? "Working…" : "Approve"}
          </Btn>
          <Btn tone="danger" onClick={onReject} disabled={busy}>
            Reject
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
