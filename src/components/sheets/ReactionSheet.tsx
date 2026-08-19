import { ThumbsUp, ThumbsDown, EyeOff, Flag } from "lucide-react";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: DiscoverySite | undefined;
  current?: ReactionKind | undefined;
  onReacted?: ((kind: ReactionKind) => void) | undefined;
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
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Your reaction" eyebrow="Reaction">
      <SheetRow
        icon={<ThumbsUp size={ICON} />}
        label="I like it"
        onClick={react("like")}
        selected={current === "like"}
        {...(current === "like" ? { trailing: <Selected /> } : {})}
      />
      <SheetRow
        icon={<ThumbsDown size={ICON} />}
        label="Not for me"
        onClick={react("not_for_me")}
        selected={current === "not_for_me"}
        {...(current === "not_for_me" ? { trailing: <Selected /> } : {})}
      />
      <SheetRow
        icon={<EyeOff size={ICON} />}
        label="Don't show this again"
        onClick={react("hidden")}
        selected={current === "hidden"}
        {...(current === "hidden" ? { trailing: <Selected /> } : {})}
      />
      <SheetRow
        icon={<Flag size={ICON} />}
        label="Report spam"
        tone="destructive"
        onClick={react("report")}
        selected={current === "report"}
        {...(current === "report" ? { trailing: <Selected /> } : {})}
      />
    </BaseSheet>
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
