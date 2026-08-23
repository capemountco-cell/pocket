import { useState } from "react";
import { Copy, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { BaseSheet } from "@/components/ui/base-sheet";
import { SheetRow, SheetRowBadge } from "@/components/ui/sheet-row";
import { recordEvent } from "@/lib/discovery";
import { getDeviceId } from "@/lib/device-id";
import type { DiscoverySite } from "@/lib/discovery";
import { writeClipboard } from "@/lib/utils";

const ICON = 21;

// Everything that sends the current site somewhere other than this device:
// to the clipboard, to whatever the OS share sheet offers, or -- once there
// is somewhere to put it -- to another person using the app.
export function SendToSheet({
  open,
  onOpenChange,
  site,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: DiscoverySite | undefined;
}) {
  // The Web Share API only exists on some browsers; the row copies instead of
  // disappearing, so the same tap always sends the link somewhere.
  const [sharing, setSharing] = useState(false);

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
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Send this site to"
      eyebrow="Send to"
      {...(site ? {} : { description: "Open a site first — there's nothing here to send." })}
    >
      <SheetRow icon={<Copy size={ICON} />} label="Copy link" onClick={copyLink} disabled={!site} />
      <SheetRow icon={<Share2 size={ICON} />} label="Share" onClick={share} disabled={!site} />
      {/* Not built, and honestly labelled as such. Sending a site to another
          person needs somewhere to put it -- a shares table, and a way to
          find the person -- and neither exists in this database yet. */}
      <SheetRow
        icon={<Users size={ICON} />}
        label="Send to a friend"
        disabled
        trailing={<SheetRowBadge>Not yet</SheetRowBadge>}
      />
    </BaseSheet>
  );
}
