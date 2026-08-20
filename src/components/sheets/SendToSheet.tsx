import { useState } from "react";
import { Bookmark, BookmarkCheck, Copy, Share2, Users } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BaseSheet } from "@/components/ui/base-sheet";
import { SheetRow, SheetRowBadge } from "@/components/ui/sheet-row";
import { toggleSaved } from "@/lib/site-prefs";
import { recordEvent } from "@/lib/discovery";
import { getDeviceId } from "@/lib/device-id";
import { APP_NAME } from "@/lib/brand";
import type { DiscoverySite } from "@/lib/discovery";

const ICON = 21;

// Everything that sends the current site somewhere: to this device's
// collection, to the clipboard, or to whatever the OS share sheet offers.
export function SendToSheet({
  open,
  onOpenChange,
  site,
  saved,
  onOpenSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: DiscoverySite | undefined;
  saved: boolean;
  onOpenSaved: () => void;
}) {
  // The Web Share API only exists on some browsers; the row copies instead of
  // disappearing, so the same tap always sends the link somewhere.
  const [sharing, setSharing] = useState(false);
  const navigate = useNavigate();

  const copyLink = async () => {
    if (!site) return;
    const ok = await writeClipboard(site.url);
    if (ok) {
      const deviceId = getDeviceId();
      if (deviceId) recordEvent(deviceId, "copy_link", site.id);
    }
    onOpenChange(false);
    toast(ok ? "Link copied" : "Couldn't reach the clipboard");
  };

  const share = async () => {
    if (!site || sharing) return;
    setSharing(true);
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: site.title, text: site.blurb, url: site.url });
        const deviceId = getDeviceId();
        if (deviceId) recordEvent(deviceId, "share", site.id);
        onOpenChange(false);
        return;
      }
      const ok = await writeClipboard(site.url);
      onOpenChange(false);
      toast(ok ? "Link copied — sharing isn't available here" : "Couldn't reach the clipboard");
    } catch {
      // A cancelled share is a normal outcome, not an error worth a toast.
    } finally {
      setSharing(false);
    }
  };

  return (
    <BaseSheet open={open} onOpenChange={onOpenChange} title="Send this site to" eyebrow="Send to">
      <SheetRow
        icon={saved ? <BookmarkCheck size={ICON} /> : <Bookmark size={ICON} />}
        label={saved ? "Remove from saved" : "Save this site"}
        onClick={() => {
          if (!site) return;
          void toggleSaved(site).then((nowSaved) =>
            toast(nowSaved ? "Saved" : "Removed from saved"),
          );
        }}
      />
      <SheetRow icon={<Copy size={ICON} />} label="Copy link" onClick={copyLink} />
      <SheetRow icon={<Share2 size={ICON} />} label="More…" onClick={share} />
      <SheetRow
        icon={<Bookmark size={ICON} />}
        label="Your saved sites"
        onClick={() => {
          onOpenSaved();
          onOpenChange(false);
          void navigate({ to: "/saved" });
        }}
      />
      <SheetRow
        icon={<Users size={ICON} />}
        label="Send to a friend"
        disabled
        trailing={<SheetRowBadge>Needs an account</SheetRowBadge>}
      />
      <p
        style={{
          margin: 0,
          padding: "14px 20px 18px",
          fontSize: 13,
          lineHeight: 1.45,
          color: "var(--app-chrome-muted, #9c9c97)",
        }}
      >
        Saved sites live on this device until {APP_NAME} accounts arrive.
      </p>
    </BaseSheet>
  );
}

// Clipboard access is refused outright in some embedded and insecure
// contexts, so the caller is told whether the copy actually happened rather
// than being shown a success toast on faith.
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the failure path */
  }
  return false;
}
