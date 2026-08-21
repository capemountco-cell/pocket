import { useEffect, useState } from "react";
import type { AdminSession } from "@/lib/admin";
import {
  describeFailure,
  findUserByUsername,
  newIdempotencyKey,
  postAccountStats,
  postBroadcast,
  postSentLog,
  postSignIn,
  postSignOut,
  postToUser,
} from "@/lib/admin";
import { Readout } from "@/components/admin/Readout";
import { useAsync } from "@/components/admin/useAsync";
import { Btn, Chip, FAINT, MUTED, Note, Panel } from "@/components/admin/ui";
import { Field } from "@/components/admin/ui";
import type { Json } from "@/integrations/supabase/types";

type Audience = "everyone" | "one";

/**
 * What lands in people's inboxes.
 *
 * This is the other half of the reader's Inbox: a message written here is
 * exactly what shows up there. It keeps its own credentials because the
 * database does -- a second password and PIN, separate from the console's --
 * which is the right shape for the one action on this screen that reaches
 * every account at once.
 */
export function MessagesPanel() {
  const [session, setSession] = useState<AdminSession | null>(null);
  return session ? (
    <Composer
      session={session}
      onSignOut={() => {
        postSignOut();
        setSession(null);
      }}
    />
  ) : (
    <SignIn onSignedIn={setSession} />
  );
}

function SignIn({ onSignedIn }: { onSignedIn: (session: AdminSession) => void }) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const submit = async () => {
    if (!password || !pin) return;
    setBusy(true);
    setFailure(null);
    try {
      const session = await postSignIn(password, pin);
      if (!session) setFailure("That password and PIN don't match.");
      else onSignedIn(session);
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Messages">
      <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.5, color: MUTED }}>
        Writing to readers takes its own credentials.
      </p>
      <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        <Field
          label="PIN"
          value={pin}
          onChange={setPin}
          type="password"
          onEnter={() => void submit()}
        />
        <div>
          <Btn tone="primary" onClick={() => void submit()} disabled={busy || !password || !pin}>
            {busy ? "Checking…" : "Unlock"}
          </Btn>
        </div>
      </div>
      {failure ? <Note text={failure} tone="danger" /> : null}
    </Panel>
  );
}

function Composer({ session, onSignOut }: { session: AdminSession; onSignOut: () => void }) {
  const [audience, setAudience] = useState<Audience>("one");
  const [username, setUsername] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // Held for the life of the draft, so a double tap or a retried request is
  // one broadcast rather than two. Rolled only when a new message is started.
  const [key, setKey] = useState(newIdempotencyKey);

  const recipient = useRecipient(username);
  const log = useAsync<Json>(session.token, () => postSentLog(session.token));
  const reach = useAsync<Json>(`reach:${session.token}`, () => postAccountStats(session.token));

  const ready =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience === "everyone" || recipient.user !== null);

  const send = async () => {
    if (!ready) return;
    setBusy(true);
    setFailure(null);
    setOutcome(null);
    try {
      if (audience === "everyone") {
        await postBroadcast(session.token, subject.trim(), body.trim(), key);
        setOutcome("Sent to everyone.");
      } else if (recipient.user) {
        await postToUser(session.token, recipient.user.id, subject.trim(), body.trim());
        setOutcome(`Sent to ${recipient.user.username ?? "that account"}.`);
      }
      setSubject("");
      setBody("");
      setKey(newIdempotencyKey());
      log.reload();
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Panel title="Write" action={<Btn onClick={onSignOut}>Lock</Btn>}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Btn tone={audience === "one" ? "primary" : "quiet"} onClick={() => setAudience("one")}>
            One person
          </Btn>
          <Btn
            tone={audience === "everyone" ? "primary" : "quiet"}
            onClick={() => setAudience("everyone")}
          >
            Everyone
          </Btn>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {audience === "one" ? (
            <div>
              <Field
                label="Username"
                value={username}
                onChange={setUsername}
                placeholder="@someone"
              />
              <div style={{ marginTop: 6, minHeight: 20 }}>
                {recipient.looking ? (
                  <span style={{ fontSize: 12.5, color: FAINT }}>Looking…</span>
                ) : recipient.user ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Chip>found</Chip>
                    <span style={{ fontSize: 12.5, color: MUTED }}>
                      {recipient.user.display_name ?? recipient.user.username ?? "account"}
                    </span>
                  </span>
                ) : username.trim() ? (
                  <span style={{ fontSize: 12.5, color: FAINT }}>No account with that name.</span>
                ) : null}
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: MUTED }}>
              This reaches every account at once and cannot be recalled.
            </p>
          )}

          <Field label="Subject" value={subject} onChange={setSubject} />
          <Field label="Message" value={body} onChange={setBody} multiline />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn tone="primary" onClick={() => void send()} disabled={busy || !ready}>
              {busy ? "Sending…" : audience === "everyone" ? "Send to everyone" : "Send"}
            </Btn>
            {outcome ? <span style={{ fontSize: 13, color: MUTED }}>{outcome}</span> : null}
          </div>
        </div>

        {failure ? <Note text={failure} tone="danger" /> : null}
      </Panel>

      <Panel title="Reach">
        {reach.error ? (
          <Note text={reach.error} tone="danger" />
        ) : reach.data ? (
          <Readout value={reach.data} />
        ) : (
          <Note text="Reading…" />
        )}
      </Panel>

      <Panel title="Already sent" action={<Btn onClick={log.reload}>Refresh</Btn>}>
        {log.error ? (
          <Note text={log.error} tone="danger" />
        ) : log.data ? (
          <Readout value={log.data} />
        ) : (
          <Note text="Reading…" />
        )}
      </Panel>
    </div>
  );
}

type Recipient = {
  id: string;
  username: string | null;
  display_name: string | null;
};

/**
 * Resolves a typed username to an account as it is typed.
 *
 * Exact match, not a prefix search: the only lookup the database exposes to a
 * client is by slug, and inventing a fuzzy one on top would mean reading the
 * profiles table directly, which RLS correctly refuses.
 */
function useRecipient(username: string): { user: Recipient | null; looking: boolean } {
  const [user, setUser] = useState<Recipient | null>(null);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    const slug = username.trim();
    if (!slug) {
      setUser(null);
      setLooking(false);
      return;
    }
    let live = true;
    setLooking(true);
    const timer = setTimeout(() => {
      findUserByUsername(slug)
        .then((found) => {
          if (!live) return;
          setUser(found);
          setLooking(false);
        })
        .catch(() => {
          if (!live) return;
          setUser(null);
          setLooking(false);
        });
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [username]);

  return { user, looking };
}
