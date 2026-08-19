import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Heart, MessageCircle, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import type { DiscoverySite } from "@/data/seed-sites";

const ACTIONS = [
  { id: "react", icon: Heart, label: "React to this site" },
  { id: "save", icon: Plus, label: "Save to a collection" },
  { id: "comment", icon: MessageCircle, label: "Comment on this site" },
  { id: "share", icon: Send, label: "Send to a friend" },
] as const;

export function DiscoveryCard({ site }: { site: DiscoverySite }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.article
        key={site.id}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={
          reduceMotion
            ? { duration: 0.16 }
            : { type: "spring", stiffness: 340, damping: 30, mass: 0.8 }
        }
        className="hairline overflow-hidden rounded-3xl"
        style={{ backgroundColor: "var(--app-surface)" }}
      >
        {/* Placeholder presentation until the embeddability pipeline lands. */}
        <div
          aria-hidden="true"
          className="flex h-44 items-end p-4"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in oklab, var(--app-accent) 16%, var(--app-surface)) 0%, var(--app-surface-sunken) 100%)",
          }}
        >
          <span
            className="hairline rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ backgroundColor: "var(--app-surface)", color: "var(--app-chrome-muted)" }}
          >
            {site.tag}
          </span>
        </div>

        <div className="border-t p-4" style={{ borderColor: "var(--app-border)" }}>
          <p className="text-[11px] font-medium" style={{ color: "var(--app-chrome-muted)" }}>
            {site.domain}
          </p>
          <h2 className="mt-1 text-[20px] leading-tight font-semibold tracking-tight">
            {site.title}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--app-chrome-muted)" }}>
            {site.blurb}
          </p>

          <a
            href={site.url}
            target="_blank"
            rel="noreferrer noopener"
            className="hairline mt-4 flex min-h-11 items-center justify-center gap-1.5 rounded-full text-[14px] font-medium"
            style={{ backgroundColor: "var(--app-surface-sunken)" }}
          >
            Open site
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {ACTIONS.map(({ id, icon: Icon, label }) => (
              <motion.button
                key={id}
                type="button"
                aria-label={label}
                onClick={() => toast(`${label} arrives in a later pass.`)}
                whileTap={reduceMotion ? { opacity: 0.6 } : { scale: 0.9 }}
                transition={
                  reduceMotion
                    ? { duration: 0.12 }
                    : { type: "spring", stiffness: 620, damping: 26, mass: 0.6 }
                }
                className="hairline flex min-h-11 items-center justify-center rounded-2xl"
                style={{ color: "var(--app-chrome-fg)" }}
              >
                <Icon aria-hidden="true" strokeWidth={1.9} className="size-[19px]" />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.article>
    </AnimatePresence>
  );
}
