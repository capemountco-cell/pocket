import { useState } from "react";
import { embedCatalogue } from "@/lib/admin";
import { Btn, FAINT, MUTED, Note, Panel } from "@/components/admin/ui";

/**
 * Fills in the catalogue's embeddings.
 *
 * This is what makes recommendations work. The affinity engine scores a site
 * from its category and its tags, and most of the catalogue has neither -- so
 * for most rows the personalised score falls back to popularity. An embedding
 * describes a page without anyone having labelled it.
 *
 * Runs as a loop of small batches because the job is resumable by design: the
 * function takes a bite and reports what is left, so a wall clock or a closed
 * tab costs progress but never correctness. Re-running it only ever picks up
 * what is still missing.
 */
export function EmbedPanel({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setFailure(null);
    setNote(null);
    let embedded = 0;
    let bad = 0;
    try {
      // Bounded so a bug upstream cannot spin here forever; at 200 a batch
      // this covers a catalogue many times the current size.
      for (let pass = 0; pass < 200; pass++) {
        const batch = await embedCatalogue(token);
        if (!batch.ok) {
          setFailure(batch.message ?? "The embedding job refused.");
          return;
        }
        embedded += batch.processed ?? 0;
        bad += batch.failed ?? 0;
        setDone(embedded);
        setFailed(bad);
        setLeft(batch.remaining ?? null);
        if (batch.done || (batch.processed ?? 0) === 0) break;
      }
      setNote(
        embedded === 0 && bad === 0
          ? "Everything is already embedded."
          : `Embedded ${embedded.toLocaleString()}${bad > 0 ? `, ${bad} failed` : ""}.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Recommendations"
      action={
        <Btn onClick={() => void run()} disabled={busy}>
          {busy ? "Embedding…" : "Embed catalogue"}
        </Btn>
      }
    >
      <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.5, color: MUTED }}>
        Personalisation matches a reader against a site&rsquo;s category and tags. Most of the
        catalogue has neither, so it falls back to popularity. Embedding gives every site a
        description that does not depend on being labelled — after which recommendations cost
        nothing per serve.
      </p>
      {busy || done > 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: FAINT, fontVariantNumeric: "tabular-nums" }}>
          {done.toLocaleString()} embedded
          {failed > 0 ? ` · ${failed} failed` : ""}
          {left !== null ? ` · ${left.toLocaleString()} to go` : ""}
        </p>
      ) : null}
      {note ? <Note text={note} /> : null}
      {failure ? <Note text={failure} tone="danger" /> : null}
    </Panel>
  );
}
