import { ThumbsUp, ThumbsDown, EyeOff, Flag, MessageSquare } from "lucide-react";
import { BaseSheet } from "@/components/ui/base-sheet";
import { SheetRow } from "@/components/ui/sheet-row";
import { setReaction, type ReactionKind } from "@/lib/site-prefs";
import type { DiscoverySite } from "@/lib/discovery";

const ICON = 21;

// How the current site is judged. Every option writes a reaction and closes --
// the choice IS the action, so there's no confirm step to get wrong.
export function ReactionSheet({
  open,
  onOpenChange,
  site,
  current,
  onReacted,
  onOpenComments,
  commentCount = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: DiscoverySite | undefined;
  current?: ReactionKind | undefined;
  onReacted?: ((kind: ReactionKind) => void) | undefined;
  onOpenComments?: (() => void) | undefined;
  /** Includes anything posted this session, which the site row predates. */
  commentCount?: number | undefined;
}) {
  const react = (kind: ReactionKind) => () => {
    if (!site) return;
    // Optimistic by design: the write lands in the background so the sheet
    // can close on the tap. Re-picking "I like it" clears it server-side.
    void setReaction(site.id, kind);
    onOpenChange(false);
    onReacted?.(kind);
  };

  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Your reaction"
      eyebrow="Reaction"
      {...(site ? {} : { description: "Open a site first — there's nothing here to react to." })}
    >
      <SheetRow
        icon={<ThumbsUp size={ICON} />}
        label="I like it"
        onClick={react("like")}
        disabled={!site}
        selected={current === "like"}
        {...(current === "like" ? { trailing: <Selected /> } : {})}
      />
      <SheetRow
        icon={<ThumbsDown size={ICON} />}
        label="Not for me"
        onClick={react("not_for_me")}
        disabled={!site}
        selected={current === "not_for_me"}
        {...(current === "not_for_me" ? { trailing: <Selected /> } : {})}
      />
      <SheetRow
        icon={<EyeOff size={ICON} />}
        label="Don't show this again"
        onClick={react("hidden")}
        disabled={!site}
        selected={current === "hidden"}
        {...(current === "hidden" ? { trailing: <Selected /> } : {})}
      />
      <SheetRow
        icon={<Flag size={ICON} />}
        label="Report spam"
        tone="destructive"
        onClick={react("report")}
        disabled={!site}
        selected={current === "report"}
        {...(current === "report" ? { trailing: <Selected /> } : {})}
      />
      {/* Last, and after the destructive row rather than before it. The four
          above all decide something about the site and then close; this one
          opens another surface instead, so it sits apart from them at the end
          rather than splitting the run of verdicts in two. */}
      <SheetRow
        icon={<MessageSquare size={ICON} />}
        label="Comments"
        onClick={() => onOpenComments?.()}
        disabled={!site}
        {...(commentCount > 0 ? { trailing: <Count n={commentCount} /> } : {})}
      />
    </BaseSheet>
  );
}

/** How many are already there. Absent rather than "0" when there are none. */
function Count({ n }: { n: number }) {
  return (
    <span
      style={{
        fontSize: 13,
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        color: "var(--app-chrome-muted, #9c9c97)",
      }}
    >
      {n}
    </span>
  );
}

// The selected reaction is marked with a word, not only a highlight, so the
// state survives for anyone who can't read the colour difference.
function Selected() {
  return (
    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--app-chrome-muted, #9c9c97)" }}>
      Selected
    </span>
  );
}
