import { useEffect, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { BaseSheet } from "@/components/ui/base-sheet";
import { probeEmbeddable } from "@/lib/embeddability";
import { recordEvent, submitSite } from "@/lib/discovery";
import { getDeviceId } from "@/lib/device-id";

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

  // A sheet that reopens holding the last attempt reads as broken state.
  useEffect(() => {
    if (!open) {
      setValue("");
      setBusy(false);
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
    try {
      // Embeddability is measured from the origin's live headers at submit
      // time and stored on the row, so the site renders correctly the first
      // time it is served instead of failing silently inside a frame.
      const probe = await probeEmbeddable({ data: { url } });
      if (!probe.ok) {
        toast(probe.reason ?? "That address didn't answer.");
        return;
      }

      const result = await submitSite(deviceId, probe.url, {
        embeddable: probe.embeddable,
        title: probe.title,
      });
      if (!result.ok) {
        toast(result.reason);
        return;
      }

      recordEvent(deviceId, "submit_success");
      onOpenChange(false);
      toast(`${probe.domain} sent for review`);
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
        <button
          type="button"
          onClick={submit}
          disabled={busy || value.trim().length === 0}
          style={{
            display: "flex",
            width: "100%",
            minHeight: 52,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            border: 0,
            background: "var(--app-chrome-fill, #161616)",
            color: "var(--app-chrome-fg, #ffffff)",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            opacity: busy || value.trim().length === 0 ? 0.5 : 1,
            cursor: busy || value.trim().length === 0 ? "default" : "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {busy ? "Checking…" : "Submit"}
        </button>
      }
    >
      <div style={{ padding: "4px 20px 18px" }}>
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
        <p
          style={{
            margin: "12px 2px 0",
            fontSize: 13,
            lineHeight: 1.45,
            color: "var(--app-chrome-muted, #9c9c97)",
          }}
        >
          We check the address before it goes in, and respect sites that ask not to be embedded —
          those are served as a preview card instead. Every submission is reviewed before anyone
          else is shown it.
        </p>
      </div>
    </BaseSheet>
  );
}
