import { useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import {
  adminAccountStats,
  adminModeration,
  adminRecalculate,
  adminSettings,
  adminSiteCounts,
  adminStats,
  describeFailure,
} from "@/lib/admin";
import { Readout } from "@/components/admin/Readout";
import { useAsync } from "@/components/admin/useAsync";
import { Btn, Note, Panel } from "@/components/admin/ui";

/** A section either has a reading or has a reason it doesn't. */
type Section = { value: Json } | { failure: string };

type Overview = {
  stats: Section;
  counts: Section;
  accounts: Section;
  moderation: Section;
  settings: Section;
};

const SECTIONS: Array<{ key: keyof Overview; title: string }> = [
  { key: "stats", title: "Catalogue" },
  { key: "counts", title: "Sites by status" },
  { key: "accounts", title: "Accounts" },
  { key: "moderation", title: "Moderation" },
  { key: "settings", title: "Settings" },
];

/**
 * The state of the thing, on one screen.
 *
 * Five reads, fetched together and shown together. They are separate routines
 * because they were written separately, but an operator opening this screen
 * wants one answer -- "what is going on" -- so they arrive as one.
 *
 * `allSettled`, not `all`: one routine erroring is a reason to show four
 * sections and name the fifth, not to blank the page. A section that failed
 * says so in a sentence rather than as a stat tile -- an error rendered in
 * the shape of a number is the one thing worse than no number.
 */
export function OverviewPanel({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [recalc, setRecalc] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync<Overview>(token, async () => {
    const settled = await Promise.allSettled([
      adminStats(token),
      adminSiteCounts(token),
      adminAccountStats(token),
      adminModeration(token),
      adminSettings(token),
    ]);
    const [stats, counts, accounts, moderation, settings] = settled.map((result) =>
      result.status === "fulfilled"
        ? { value: result.value }
        : { failure: describeFailure(result.reason) },
    ) as [Section, Section, Section, Section, Section];
    return { stats, counts, accounts, moderation, settings };
  });

  const recalculate = async () => {
    setBusy(true);
    setRecalc(null);
    try {
      await adminRecalculate(token);
      setRecalc("Counters recalculated.");
      reload();
    } catch (cause) {
      setRecalc(describeFailure(cause));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Note text="Reading…" />;
  if (error) return <Note text={error} tone="danger" />;
  if (!data) return <Note text="Nothing came back." />;

  // Nothing reached the database at all: say it once, with a way to retry,
  // rather than printing the same sentence five times down the page.
  const failures = SECTIONS.map(({ key }) => data[key]).filter(
    (section): section is { failure: string } => "failure" in section,
  );
  if (failures.length === SECTIONS.length) {
    const first = failures[0];
    return (
      <Panel title="Overview" action={<Btn onClick={reload}>Try again</Btn>}>
        <Note text={first ? first.failure : "Nothing came back."} tone="danger" />
      </Panel>
    );
  }

  return (
    <div>
      {SECTIONS.map(({ key, title }) => {
        const section = data[key];
        return (
          <Panel
            key={key}
            title={title}
            action={
              key === "stats" ? (
                <Btn onClick={() => void recalculate()} disabled={busy}>
                  {busy ? "Recalculating…" : "Recalculate"}
                </Btn>
              ) : undefined
            }
          >
            {"failure" in section ? (
              <Note text={section.failure} tone="danger" />
            ) : (
              <Readout value={section.value} />
            )}
            {key === "stats" && recalc ? <Note text={recalc} /> : null}
          </Panel>
        );
      })}
    </div>
  );
}
