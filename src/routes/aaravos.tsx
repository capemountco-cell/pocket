import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import type { AdminSession } from "@/lib/admin";
import {
  adminCreateCredentials,
  adminCredentialsExist,
  adminSession,
  adminSignIn,
  adminSignOut,
  adminTokenValid,
  describeFailure,
} from "@/lib/admin";
import { BidsPanel } from "@/components/admin/BidsPanel";
import { MessagesPanel } from "@/components/admin/MessagesPanel";
import { OverviewPanel } from "@/components/admin/OverviewPanel";
import { QueuePanel } from "@/components/admin/QueuePanel";
import { SitesPanel } from "@/components/admin/SitesPanel";
import { Btn, Field, INK, MUTED, Note } from "@/components/admin/ui";

export const Route = createFileRoute("/aaravos")({
  head: () => ({
    meta: [
      { title: `Console — ${APP_NAME}` },
      // An operator screen has no business in a search index, and no link
      // anywhere in the app points here.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminScreen,
});

type Tab = "overview" | "queue" | "sites" | "bids" | "messages";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "queue", label: "Queue" },
  { id: "sites", label: "Sites" },
  { id: "bids", label: "Bids" },
  { id: "messages", label: "Messages" },
];

/**
 * The operator console.
 *
 * It answers on an address nobody guesses and nothing links to, and it is the
 * only address it answers on -- there is deliberately no `/admin`, because a
 * predictable path is a standing invitation to run PINs against it.
 *
 * Every button here is a SECURITY DEFINER routine the database gates on a
 * token, so this screen holds no authority of its own: it can only ask, and
 * the database decides. Both halves of the credential are checked in Postgres,
 * not here, and a token that has expired or been revoked simply stops working
 * mid-session.
 *
 * The token lives in sessionStorage and dies with the tab.
 */
function AdminScreen() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  // sessionStorage does not exist during the server render, so a stored
  // session is picked up after mount rather than during it -- reading it in
  // render would mean the server sends the PIN gate and the client
  // immediately replaces it, which React reports as a hydration mismatch.
  useEffect(() => {
    const stored = adminSession();
    if (!stored) {
      setChecking(false);
      return;
    }
    let live = true;
    adminTokenValid(stored.token)
      .then((ok) => {
        if (!live) return;
        if (ok) setSession(stored);
        else adminSignOut();
        setChecking(false);
      })
      .catch(() => {
        if (!live) return;
        // Unreachable is not the same as invalid, so the session is kept and
        // the first panel load reports whatever is actually wrong.
        setSession(stored);
        setChecking(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    // Fixed and inset, like every other full screen here. A page in normal
    // flow would let the document's own pale background show through on an
    // overscroll bounce, and would put the section tabs out of reach the
    // moment a list got long.
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#000000",
        color: INK,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ ...COLUMN, flex: "0 0 auto", padding: "14px 20px 0" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <Link
            to="/"
            aria-label={`Back to ${APP_NAME}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              marginLeft: -10,
              borderRadius: 999,
              color: INK,
            }}
          >
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <h1
            style={{
              flex: "1 1 auto",
              margin: 0,
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Console
          </h1>
          {session ? (
            <Btn
              onClick={() => {
                adminSignOut();
                setSession(null);
              }}
            >
              Sign out
            </Btn>
          ) : null}
        </header>

        {session ? (
          <nav
            aria-label="Console sections"
            style={{
              display: "flex",
              gap: 8,
              paddingBottom: 16,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {TABS.map((entry) => (
              <Btn
                key={entry.id}
                tone={tab === entry.id ? "primary" : "quiet"}
                onClick={() => setTab(entry.id)}
              >
                {entry.label}
              </Btn>
            ))}
          </nav>
        ) : null}
      </div>

      <div
        style={{
          ...COLUMN,
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "0 20px 40px",
        }}
      >
        {checking ? (
          <Note text="Checking…" />
        ) : !session ? (
          <Gate onSignedIn={setSession} />
        ) : tab === "overview" ? (
          <OverviewPanel token={session.token} />
        ) : tab === "queue" ? (
          <QueuePanel token={session.token} />
        ) : tab === "sites" ? (
          <SitesPanel token={session.token} />
        ) : tab === "bids" ? (
          <BidsPanel token={session.token} />
        ) : (
          <MessagesPanel />
        )}
      </div>
    </main>
  );
}

const COLUMN: React.CSSProperties = {
  width: "100%",
  maxWidth: 760,
  marginInline: "auto",
  boxSizing: "border-box",
};

/**
 * The way in.
 *
 * Two screens, and which one you get is the database's answer, not a setting:
 * an unclaimed console offers to be claimed, a claimed one asks to be
 * unlocked. Setup is still reachable from the gate, because someone locked
 * out of their own console deserves to be told why by the console rather than
 * left guessing at a form that will not take their PIN.
 */
function Gate({ onSignedIn }: { onSignedIn: (session: AdminSession) => void }) {
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const [setup, setSetup] = useState(false);

  useEffect(() => {
    let live = true;
    adminCredentialsExist()
      .then((existing) => live && setClaimed(existing.password && existing.pin))
      .catch(() => live && setClaimed(true));
    return () => {
      live = false;
    };
  }, []);

  if (claimed === null) return <Note text="Checking…" />;
  if (claimed && !setup) {
    return <SignIn onSignedIn={onSignedIn} onLockedOut={() => setSetup(true)} />;
  }
  return <Setup onSignedIn={onSignedIn} {...(claimed ? { onBack: () => setSetup(false) } : {})} />;
}

function SignIn({
  onSignedIn,
  onLockedOut,
}: {
  onSignedIn: (session: AdminSession) => void;
  onLockedOut: () => void;
}) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const ready = password.trim().length > 0 && pin.trim().length > 0;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setFailure(null);
    try {
      const session = await adminSignIn(password, pin.trim());
      // Wrong credentials come back as no rows, not as an error. Which half
      // was wrong is deliberately not said: that is a hint worth giving an
      // operator and not worth giving anyone else.
      if (!session) setFailure("That password and PIN don't match.");
      else onSignedIn(session);
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 320, paddingTop: 8 }}>
      <p style={{ margin: "0 0 16px", fontSize: 14.5, lineHeight: 1.5, color: MUTED }}>
        This screen manages the catalogue and writes to readers&rsquo; inboxes.
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Password" value={password} onChange={setPassword} type="password" autoFocus />
        <Field
          label="PIN"
          value={pin}
          onChange={setPin}
          type="password"
          onEnter={() => void submit()}
        />
        <div>
          <Btn tone="primary" onClick={() => void submit()} disabled={busy || !ready}>
            {busy ? "Checking…" : "Unlock"}
          </Btn>
        </div>
      </div>
      {failure ? <Note text={failure} tone="danger" /> : null}
      <button type="button" onClick={onLockedOut} style={QUIET_LINK}>
        Can&rsquo;t get in?
      </button>
      <p style={{ marginTop: 24, fontSize: 12.5, lineHeight: 1.5, color: "rgba(255,255,255,0.3)" }}>
        Nothing here is decided in the browser. Both halves are checked in the database, and every
        action below is a routine that verifies the token it was given.
      </p>
    </div>
  );
}

/**
 * Claiming a console that has never been claimed.
 *
 * On success it signs straight in with what was just chosen, so nobody has to
 * type it twice into a screen that has already accepted it.
 */
function Setup({
  onSignedIn,
  onBack,
}: {
  onSignedIn: (session: AdminSession) => void;
  onBack?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const ready = password.trim().length > 0 && pin.trim().length > 0;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setFailure(null);
    try {
      const outcome = await adminCreateCredentials(password, pin.trim());
      if (!outcome.ok) {
        setFailure(outcome.reason);
        return;
      }
      const session = await adminSignIn(password, pin.trim());
      if (session) onSignedIn(session);
      else setFailure("The credentials were created but would not sign in. Try unlocking.");
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 340, paddingTop: 8 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>
        Set up the console
      </h2>
      <p style={{ margin: "0 0 16px", fontSize: 14.5, lineHeight: 1.5, color: MUTED }}>
        Choose a password and a PIN. Both are needed every time, and neither can be recovered from
        here afterwards.
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Password" value={password} onChange={setPassword} type="password" autoFocus />
        <Field
          label="PIN"
          value={pin}
          onChange={setPin}
          type="password"
          onEnter={() => void submit()}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Btn tone="primary" onClick={() => void submit()} disabled={busy || !ready}>
            {busy ? "Creating…" : "Create and sign in"}
          </Btn>
          {onBack ? <Btn onClick={onBack}>Back</Btn> : null}
        </div>
      </div>
      {failure ? <Note text={failure} tone="danger" /> : null}
      <p style={{ marginTop: 24, fontSize: 12.5, lineHeight: 1.5, color: "rgba(255,255,255,0.3)" }}>
        This can only ever create, never replace. The routines behind it are open to anyone holding
        the app&rsquo;s public key, so the database refuses them the moment a credential exists --
        otherwise the console would belong to whoever asked last.
      </p>
    </div>
  );
}

const QUIET_LINK: React.CSSProperties = {
  appearance: "none",
  background: "transparent",
  border: 0,
  margin: "18px 0 0",
  padding: 0,
  color: "rgba(255,255,255,0.45)",
  font: "inherit",
  fontSize: 13,
  textDecoration: "underline",
  textUnderlineOffset: 3,
  cursor: "pointer",
};
