import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { BaseSheet } from "@/components/ui/base-sheet";
import { SheetButton } from "@/components/ui/sheet-button";
import { recordEvent, submitAdultSite, submitSite } from "@/lib/discovery";
import { routingCopy, type SubmissionDestination } from "@/lib/submission-routing";
import { useAuth } from "@/lib/auth";
import { getDeviceId } from "@/lib/device-id";
import { classifyAdult } from "@/lib/adult-check";

// Anything a person types has to survive being wrong: a bare hostname, a
// stray space, a copied "www." prefix. Repair what's repairable before
// telling someone their link is bad.
function tidyUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function SubmitSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmissionDestination | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  // A sheet that reopens holding the last attempt reads as broken state.
  useEffect(() => {
    if (!open) {
      setValue("");
      setBusy(false);
      setResult(null);
    }
  }, [open]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setValue(text.trim());
    } catch {
      toast("Clipboard access was refused — paste with your keyboard instead.");
    }
  };

  const submit = async () => {
    const url = tidyUrl(value);
    const deviceId = getDeviceId();
    if (!url || !deviceId) return;
    setBusy(true);
    setResult(null);
    try {
      // Adult links come in by their own door only because
      // classify-submission refuses them outright and its deploy pipeline
      // cannot be changed from here. Nothing else about them is special: the
      // row lands live and flagged, it competes for rank on the same score as
      // everything else, and the flag buys it a content warning rather than a
      // lesser tier. So the outcome shown is the ordinary one.
      const verdict = await classifyAdult({ data: { url } }).catch(() => null);

      // Priced before adult, because a link can be both and the auction is
      // where both of them end up -- but only this branch keeps it out of the
      // free catalogue, so it has to be the one that runs.
      if (verdict?.intent.priced && verdict.intent.reason) {
        onOpenChange(false);
        void navigate({ to: "/explore", search: { url, why: verdict.intent.reason } });
        return;
      }

      if (verdict?.adult) {
        const added = await submitAdultSite(deviceId, url);
        if (!added.ok) {
          toast(added.message);
          return;
        }
        recordEvent(deviceId, "submit_success");
        setResult("stumble");
        return;
      }

      // Everything else -- normalising, safety, embeddability, the model's
      // judgement, the banned list, the auto/review setting, the insert --
      // happens inside classify-submission. Nothing is decided on this side.
      const outcome = await submitSite(deviceId, url, auth.user?.id);
      if (!outcome.ok) {
        toast(outcome.reason);
        return;
      }
      recordEvent(deviceId, "submit_success");
      // The sheet stays open on the outcome instead of closing on a toast: a
      // link routed to the auction has somewhere else to go, and a toast
      // is gone before anyone has read it.
      setResult(outcome.destination);
    } catch {
      toast("Couldn't check that address just now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Submit a site"
      description="Found a good corner of the web? Add it."
      footer={
        result ? (
          <SheetButton onClick={() => onOpenChange(false)}>Done</SheetButton>
        ) : (
          <SheetButton onClick={() => void submit()} disabled={busy || value.trim().length === 0}>
            {busy ? "Checking…" : "Submit"}
          </SheetButton>
        )
      }
    >
      {result ? (
        <Outcome
          destination={result}
          onBid={() => {
            onOpenChange(false);
            void navigate({ to: "/explore", search: { url: tidyUrl(value) } });
          }}
        />
      ) : null}
      <div style={{ padding: "4px 20px 18px", display: result ? "none" : "block" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minHeight: 56,
            padding: "0 14px",
            borderRadius: 14,
            border: "1.5px solid var(--app-chrome-fg, #ffffff)",
          }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Address of the site to submit"
            placeholder="https://example.com"
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              // The field is 24px of text inside a 56px box. Centred, it left
              // 16px of dead border above and below that looked tappable and
              // wasn't -- stretching it means anywhere in the box focuses it.
              alignSelf: "stretch",
              background: "transparent",
              border: 0,
              outline: "none",
              color: "var(--app-chrome-fg, #ffffff)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 16,
            }}
          />
          <button
            type="button"
            onClick={paste}
            aria-label="Paste from clipboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
              padding: "0 4px",
              background: "transparent",
              border: 0,
              color: "var(--app-chrome-fg, #ffffff)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <ClipboardPaste size={18} aria-hidden="true" />
            Paste
          </button>
        </div>
      </div>
    </BaseSheet>
  );
}

// What the classifier decided, said plainly. Colour carries the tone and the
// words repeat it, so the meaning does not depend on seeing the difference
// between a green and an amber line.
function Outcome({
  destination,
  onBid,
}: {
  destination: SubmissionDestination;
  onBid: () => void;
}) {
  const copy = routingCopy(destination);
  const ink =
    copy.tone === "positive"
      ? "var(--app-chrome-fg, #ffffff)"
      : copy.tone === "neutral"
        ? "var(--app-accent-warm, #E5C800)"
        : "var(--app-chrome-muted, #9c9c97)";

  return (
    <div style={{ padding: "4px 20px 18px" }} role="status" aria-live="polite">
      <p style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", color: ink }}>
        {copy.title}
      </p>
      {copy.detail ? (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 15,
            lineHeight: 1.45,
            color: "var(--app-chrome-muted, #9c9c97)",
          }}
        >
          {copy.detail}
        </p>
      ) : null}
      {destination === "boost_only" ? (
        // Telling someone to bid without handing them the way there is most of
        // a dead end. The address goes with them so the form is already full.
        <button
          type="button"
          onClick={onBid}
          style={{
            appearance: "none",
            margin: "14px 0 0",
            padding: "11px 16px",
            borderRadius: 12,
            border: 0,
            background: "var(--app-accent-warm, #E5C800)",
            color: "#161600",
            font: "inherit",
            fontSize: 15,
            fontWeight: 750,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Place a bid
        </button>
      ) : null}
    </div>
  );
}
