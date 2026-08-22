import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BaseSheet } from "@/components/ui/base-sheet";
import { SheetButton } from "@/components/ui/sheet-button";
import { getDeviceId } from "@/lib/device-id";
import { recordEvent } from "@/lib/discovery";
import {
  ago,
  COMMENT_MAX,
  fetchComments,
  postComment,
  removeComment,
  reportComment,
  type SiteComment,
} from "@/lib/comments";
import type { DiscoverySite } from "@/lib/discovery";

const MUTED = "var(--app-chrome-muted, #9c9c97)";

/**
 * What people have said about the site currently on screen, and a way to add
 * to it.
 *
 * Read and write in one surface rather than two. A separate "view comments"
 * and "leave a comment" would double the taps for the common case, which is
 * reading what is there and then answering it.
 *
 * The list is newest first: this is a running reaction to a site, not a
 * conversation with a beginning, and the thing worth seeing on open is the
 * most recent thought rather than the oldest.
 */
export function CommentsSheet({
  open,
  onOpenChange,
  site,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: DiscoverySite | undefined;
  /** +1 for a post, -1 for a removal, so a count elsewhere can keep up. */
  onChanged?: ((delta: number) => void) | undefined;
}) {
  const [comments, setComments] = useState<SiteComment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);

  const siteId = site?.id;

  const load = useCallback(async () => {
    if (!siteId) return;
    try {
      const page = await fetchComments(siteId, getDeviceId());
      setComments(page.comments);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [siteId]);

  useEffect(() => {
    if (!open || !siteId) return;
    setComments(null);
    setFailed(false);
    setDraft("");
    // Opening is recorded by whoever opened it (openFromSheet), on the single
    // path this codebase already uses for sheet handoffs.
    void load();
  }, [open, siteId, load]);

  const send = async () => {
    const deviceId = getDeviceId();
    const body = draft.trim();
    if (!deviceId || !siteId || !body || busy) return;
    setBusy(true);
    try {
      const result = await postComment(deviceId, siteId, body);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      // Cleared only on success, so a refused comment is still there to fix
      // rather than retyped from memory.
      setDraft("");
      recordEvent(deviceId, "comment_add", siteId);
      await load();
      onChanged?.(1);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (comment: SiteComment) => {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    // Optimistic: the row goes now and comes back if the server disagrees.
    setComments((prev) => prev?.filter((c) => c.id !== comment.id) ?? prev);
    const ok = await removeComment(deviceId, comment.id);
    if (!ok) {
      toast("Couldn't remove that.");
      void load();
      return;
    }
    onChanged?.(-1);
  };

  const report = async (comment: SiteComment) => {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    const ok = await reportComment(deviceId, comment.id);
    toast(ok ? "Reported. Thanks." : "Couldn't report that.");
    if (ok) void load();
  };

  const left = COMMENT_MAX - draft.trim().length;
  const over = left < 0;

  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Comments"
      eyebrow="Comments"
      description={site ? `On ${site.domain}` : undefined}
      // Full rather than half. At half height the list got 173px to show 345px
      // of comments -- a reading surface you have to scroll twice to see three
      // remarks in. The composer is anchored below it either way, so the extra
      // room all goes to the thread.
      size="full"
      footer={
        <div style={{ padding: "0 20px 4px" }}>
          <textarea
            ref={field}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Say something about this site"
            rows={2}
            // 16px or iOS zooms the whole page on focus.
            style={{
              width: "100%",
              boxSizing: "border-box",
              resize: "none",
              padding: "11px 13px",
              borderRadius: 13,
              border: `1.5px solid ${over ? "#ff6b6b" : "var(--app-chrome-fg, #ffffff)"}`,
              background: "transparent",
              color: "var(--app-chrome-fg, #ffffff)",
              font: "inherit",
              fontSize: 16,
              lineHeight: 1.4,
              outline: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              margin: "8px 0 0",
            }}
          >
            {/* Only ever shown when it starts to matter. A counter sitting at
                500 from the first keystroke is noise. */}
            <span
              style={{
                fontSize: 12.5,
                fontVariantNumeric: "tabular-nums",
                color: over ? "#ff6b6b" : MUTED,
                visibility: left <= 80 ? "visible" : "hidden",
              }}
            >
              {left}
            </span>
            <SheetButton onClick={() => void send()} disabled={busy || !draft.trim() || over}>
              {busy ? "Posting…" : "Post"}
            </SheetButton>
          </div>
        </div>
      }
    >
      <div style={{ padding: "2px 20px 12px" }}>
        {failed ? (
          <Empty text="Couldn't load the comments." />
        ) : comments === null ? (
          <Empty text="Loading…" />
        ) : comments.length === 0 ? (
          <Empty text="Nothing yet. Be the first." />
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onRemove={() => void remove(comment)}
                onReport={() => void report(comment)}
              />
            ))}
          </ul>
        )}
      </div>
    </BaseSheet>
  );
}

function Comment({
  comment,
  onRemove,
  onReport,
}: {
  comment: SiteComment;
  onRemove: () => void;
  onReport: () => void;
}) {
  return (
    <li style={{ padding: "12px 0", borderBottom: "1px solid rgba(128,128,128,0.16)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: "0.03em",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            color: "var(--app-chrome-fg, #ffffff)",
            opacity: 0.75,
          }}
        >
          {comment.mine ? "You" : comment.author}
        </span>
        <span style={{ fontSize: 12.5, color: MUTED }}>{ago(comment.createdAt)}</span>
        <span style={{ flex: "1 1 auto" }} />
        {/* Yours to delete, everyone else's to report. Never both, so the
            destructive tap is never next to the one that isn't. */}
        <button
          type="button"
          onClick={comment.mine ? onRemove : onReport}
          aria-label={comment.mine ? "Delete your comment" : "Report this comment"}
          style={{
            appearance: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            margin: "-6px -6px -6px 0",
            border: 0,
            background: "transparent",
            color: MUTED,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {comment.mine ? <Trash2 size={15} /> : <Flag size={15} />}
        </button>
      </div>
      <p
        style={{
          margin: "5px 0 0",
          fontSize: 15,
          lineHeight: 1.45,
          color: "var(--app-chrome-fg, #ffffff)",
          // Someone else's sentence, so it wraps rather than being cut, and a
          // pasted address cannot push the sheet sideways.
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}
      >
        {comment.body}
      </p>
    </li>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p role="status" style={{ margin: "26px 0", fontSize: 15, color: MUTED, textAlign: "center" }}>
      {text}
    </p>
  );
}
