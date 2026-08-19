import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BaseSheet } from "@/components/ui/base-sheet";
import { getDeviceId } from "@/lib/device-id";
import { ensureProfile } from "@/lib/auth";
import { recordEvent, type EventKind } from "@/lib/discovery";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type InstantAuthResponse = {
  ok: boolean;
  status?: "created" | "claimed" | "exists";
  error?: string;
  message?: string;
};

function track(kind: EventKind) {
  const id = getDeviceId();
  if (id) recordEvent(id, kind);
}

// Single-step sign-in: email plus password, one tap. Accounts are created --
// or claimed, if an earlier signup was stranded unverified -- already
// confirmed by the instant-auth function, so there is no check-your-email step
// anywhere in this flow. Email deliverability used to block people from
// getting in at all, which is why the inbox is not on the critical path. A
// magic link stays as a fallback for older accounts that never set a password.
export function AuthSheet({
  open,
  onOpenChange,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedIn?: (() => void) | undefined;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // A reopened sheet must not still hold the last attempt's password or error.
  useEffect(() => {
    if (open) return;
    setPassword("");
    setBusy(false);
    setWrongPassword(false);
    setSentTo(null);
  }, [open]);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= MIN_PASSWORD;
  const canContinue = emailValid && passwordValid && !busy;

  const finish = async (kind: EventKind, message: string) => {
    await ensureProfile("instant_password");
    track(kind);
    toast.success(message);
    onSignedIn?.();
    onOpenChange(false);
  };

  // Client-only path for when the instant-auth function can't be reached.
  // Returns true once a live session exists.
  async function directAuthFallback(): Promise<boolean> {
    const creds = { email: email.trim(), password };

    const signIn = await supabase.auth.signInWithPassword(creds);
    if (!signIn.error && signIn.data.session) return true;

    if ((signIn.error?.message ?? "").toLowerCase().includes("not confirmed")) {
      toast.error("This account still needs email confirmation. Try again shortly.");
      track("auth_error");
      return false;
    }

    const signUp = await supabase.auth.signUp(creds);
    if (signUp.error) {
      const message = signUp.error.message.toLowerCase();
      if (message.includes("already registered") || message.includes("already exists")) {
        setWrongPassword(true);
        track("auth_wrong_password");
        return false;
      }
      throw signUp.error;
    }
    if (signUp.data.session) return true;

    // Created but no session: this project has email confirmations on, and
    // without the function there is no inline instant sign-in.
    toast.error("Account created. Check your email to confirm and finish signing in.");
    track("auth_error");
    return false;
  }

  async function handleContinue() {
    if (!canContinue) return;
    setBusy(true);
    setWrongPassword(false);

    try {
      let status: InstantAuthResponse["status"];
      try {
        const { data, error } = await supabase.functions.invoke<InstantAuthResponse>(
          "instant-auth",
          { body: { email: email.trim(), password, device_id: getDeviceId() } },
        );
        if (error) throw error;
        if (!data?.ok) {
          const code = data?.error ?? "server_error";
          if (code === "rate_limited") {
            toast.error(data?.message ?? "Too many attempts — try again later.");
            track("auth_error");
            return;
          }
          if (code === "password_too_short") {
            toast.error(`Password must be at least ${MIN_PASSWORD} characters.`);
            return;
          }
          throw new Error(code);
        }
        status = data.status;
      } catch {
        // Function unreachable or erroring: fall through to direct auth so
        // signing in still works rather than dead-ending on infrastructure.
        if (await directAuthFallback()) {
          await finish("auth_instant_signin", "Signed in.");
        }
        return;
      }

      const signIn = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signIn.error) {
        const message = signIn.error.message.toLowerCase();
        const badCredentials =
          message.includes("invalid login") || message.includes("invalid credentials");
        if (status === "exists" && badCredentials) {
          // The account exists and this password isn't it -- or was never set.
          setWrongPassword(true);
          track("auth_wrong_password");
          return;
        }
        throw signIn.error;
      }

      if (status === "created") {
        await finish("auth_instant_created", "Account created — you're in.");
      } else if (status === "claimed") {
        await finish("auth_instant_claimed", "Signed in.");
      } else {
        await finish("auth_instant_signin", "Signed in.");
      }
    } catch (error) {
      track("auth_error");
      toast.error((error as { message?: string })?.message ?? "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  // Fallback only: accounts made before passwords existed have none to use.
  async function handleMagicLink() {
    if (!emailValid || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          ...(typeof window !== "undefined" ? { emailRedirectTo: window.location.origin } : {}),
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      setSentTo(email.trim());
      track("auth_magic_sent");
      toast.success("Check your inbox for the sign-in link.");
    } catch (error) {
      track("auth_error");
      toast.error((error as { message?: string })?.message ?? "Could not send sign-in email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Sign in or sign up"
      description="New accounts are ready instantly — no email verification needed."
      footer={
        <button
          type="button"
          onClick={() => void handleContinue()}
          disabled={!canContinue}
          style={{
            display: "flex",
            width: "100%",
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: 0,
            background: "var(--app-chrome-fg, #ffffff)",
            color: "var(--app-chrome-bg, #000000)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            opacity: canContinue ? 1 : 0.5,
            cursor: canContinue ? "pointer" : "default",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {busy ? "Just a moment…" : "Continue"}
        </button>
      }
    >
      <div style={{ padding: "4px 20px 18px" }}>
        <label htmlFor="auth-email" style={LABEL}>
          Email
        </label>
        <input
          id="auth-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          spellCheck={false}
          placeholder="you@example.com"
          style={FIELD}
        />

        <label htmlFor="auth-password" style={{ ...LABEL, marginTop: 14 }}>
          Password
        </label>
        <input
          id="auth-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setWrongPassword(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleContinue();
          }}
          type="password"
          autoComplete="current-password"
          placeholder={`At least ${MIN_PASSWORD} characters`}
          style={FIELD}
        />

        {wrongPassword ? (
          <div style={{ marginTop: 12 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.45,
                color: "var(--app-destructive, #FF453A)",
              }}
            >
              That account exists but the password doesn&apos;t match. If you never set one, get a
              sign-in link instead.
            </p>
            <button
              type="button"
              onClick={() => void handleMagicLink()}
              disabled={busy}
              style={{
                marginTop: 10,
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
                background: "transparent",
                color: "var(--app-chrome-fg, #ffffff)",
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Email me a sign-in link
            </button>
          </div>
        ) : null}

        {sentTo ? (
          <p
            style={{ margin: "12px 0 0", fontSize: 14, color: "var(--app-chrome-muted, #9c9c97)" }}
          >
            Link sent to {sentTo}. It expires shortly.
          </p>
        ) : null}

        <p
          style={{
            margin: "14px 0 0",
            fontSize: 13,
            lineHeight: 1.45,
            color: "var(--app-chrome-muted, #9c9c97)",
          }}
        >
          Signing in attaches the sites you have already saved on this device to your account.
        </p>
      </div>
    </BaseSheet>
  );
}

const LABEL: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.02em",
  color: "var(--app-chrome-muted, #9c9c97)",
};

const FIELD: React.CSSProperties = {
  display: "block",
  width: "100%",
  minHeight: 52,
  padding: "0 14px",
  boxSizing: "border-box",
  borderRadius: 14,
  border: "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
  background: "transparent",
  color: "var(--app-chrome-fg, #ffffff)",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 16,
  outline: "none",
};
