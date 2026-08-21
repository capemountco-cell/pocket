import type { Json } from "@/integrations/supabase/types";
import { adminBoostDashboard, adminBoostSettings, describeFailure } from "@/lib/admin";
import { Readout } from "@/components/admin/Readout";
import { useAsync } from "@/components/admin/useAsync";
import { Btn, Note, Panel } from "@/components/admin/ui";

type Section = { value: Json } | { failure: string };

/**
 * What people have paid for.
 *
 * Read-only on purpose. The two routines here answer with whatever the
 * dashboard holds -- orders, their tiers, what has been delivered -- and are
 * rendered by walking the response, because their shape is not written down
 * in this repo.
 *
 * Refunding and killing a boost are deliberately not wired. `admin_mark_boost_refunded`
 * exists and takes an order id, but a mis-aimed refund is not a thing to
 * discover afterwards, and nobody has asked for that button yet.
 */
export function BoostsPanel({ token }: { token: string }) {
  const { data, error, loading, reload } = useAsync<{ orders: Section; settings: Section }>(
    `boosts:${token}`,
    async () => {
      const [orders, settings] = (
        await Promise.allSettled([adminBoostDashboard(token), adminBoostSettings(token)])
      ).map((r) =>
        r.status === "fulfilled" ? { value: r.value } : { failure: describeFailure(r.reason) },
      ) as [Section, Section];
      return { orders, settings };
    },
  );

  if (loading && !data) return <Note text="Reading…" />;
  if (error) return <Note text={error} tone="danger" />;
  if (!data) return <Note text="Nothing came back." />;

  return (
    <div>
      <Panel title="Orders" action={<Btn onClick={reload}>Refresh</Btn>}>
        {"failure" in data.orders ? (
          <Note text={data.orders.failure} tone="danger" />
        ) : (
          <Readout value={data.orders.value} />
        )}
      </Panel>
      <Panel title="Boost settings">
        {"failure" in data.settings ? (
          <Note text={data.settings.failure} tone="danger" />
        ) : (
          <Readout value={data.settings.value} />
        )}
      </Panel>
    </div>
  );
}
