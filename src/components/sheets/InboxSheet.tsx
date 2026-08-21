import { useEffect, useState } from "react";
import { BaseSheet } from "@/components/ui/base-sheet";
import { fetchInbox, isRead, markRead, type InboxMessage } from "@/lib/inbox";

/**
 * Messages from the people who run the app.
 *
 * A message is a subject and a body, so the list shows both rather than
 * hiding the body behind a tap -- an inbox with four items in it does not
 * need a detail view, and one that opens a second screen to show two
 * sentences is worse than one that just shows them.
 */
export function InboxSheet({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The signed-in person, or undefined when nobody is. */
  userId: string | undefined;
}) {
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let live = true;
    setFailed(false);
    fetchInbox(userId)
      .then((rows) => {
        if (!live) return;
        setMessages(rows);
        // Opening the inbox is reading it. Marking on open rather than on a
        // per-message tap matches what the list does: everything is on screen
        // already, so there is no second act to wait for.
        rows.forEach((m) => markRead(m.id));
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [open, userId]);

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Inbox" eyebrow="Inbox">
      <div style={{ padding: "4px 20px 18px" }}>
        {!userId ? (
          <Note text="Messages arrive once you have an account." />
        ) : failed ? (
          <Note text="Couldn't reach your messages." />
        ) : !messages ? (
          <Note text="Checking for messages…" />
        ) : messages.length === 0 ? (
          <Note text="Nothing here yet. Anything we send you will land in this list." />
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {messages.map((message, i) => (
              <li
                key={message.id}
                style={{
                  paddingTop: i === 0 ? 0 : 18,
                  marginTop: i === 0 ? 0 : 18,
                  borderTop:
                    i === 0 ? 0 : "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
                }}
              >
                <Message message={message} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </BaseSheet>
  );
}

function Message({ message }: { message: InboxMessage }) {
  // Read state is read once, when the row renders. It is set on open, so
  // recomputing here would flip everything to read while someone is looking
  // at it -- the dot should survive the session that earned it.
  const [wasUnread] = useState(() => !isRead(message));

  return (
    <article>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {wasUnread ? (
          <span
            aria-label="Unread"
            style={{
              flex: "0 0 auto",
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "var(--app-chrome-fg, #ffffff)",
              transform: "translateY(-2px)",
            }}
          />
        ) : null}
        <h3
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--app-chrome-fg, #ffffff)",
          }}
        >
          {message.subject}
        </h3>
      </div>
      <p
        style={{
          margin: "6px 0 0",
          fontSize: 15,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          color: "var(--app-chrome-muted, #9c9c97)",
        }}
      >
        {message.body}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 12.5,
          color: "var(--app-chrome-muted, #9c9c97)",
          opacity: 0.75,
        }}
      >
        {formatWhen(message.created_at)}
      </p>
    </article>
  );
}

function Note({ text }: { text: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      style={{
        margin: "10px 0 6px",
        fontSize: 15,
        lineHeight: 1.5,
        color: "var(--app-chrome-muted, #9c9c97)",
      }}
    >
      {text}
    </p>
  );
}

// Recent messages read better as "3 days ago"; older ones want a real date.
function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(then).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
