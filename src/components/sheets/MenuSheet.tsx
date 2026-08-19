import {
  Bookmark,
  BookmarkCheck,
  Compass,
  ExternalLink,
  Inbox,
  Palette,
  Plus,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { BaseSheet } from "@/components/ui/base-sheet";
import { SheetRow, SheetRowBadge } from "@/components/ui/sheet-row";
import { toggleSaved } from "@/lib/site-prefs";
import { APP_NAME } from "@/lib/brand";
import type { DiscoverySite } from "@/data/seed-sites";

const ICON = 21;

// The app's home base: who you are, where your things live, and the two
// actions that apply to whatever is on screen. Rows that need a backend say
// so on the row itself rather than being hidden -- a menu that changes shape
// once accounts land is harder to learn than one that doesn't.
export function MenuSheet({
  open,
  onOpenChange,
  site,
  saved,
  onOpenSaved,
  onOpenSubmit,
  onOpenSettings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: DiscoverySite | undefined;
  saved: boolean;
  onOpenSaved: () => void;
  onOpenSubmit: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${APP_NAME} menu`}
      header={<GuestRow />}
      footer={
        <button
          type="button"
          disabled
          aria-disabled="true"
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
            opacity: 0.5,
            cursor: "default",
          }}
        >
          Sign up &amp; log in — coming soon
        </button>
      }
    >
      <SheetRow
        icon={<Inbox size={ICON} />}
        label="Inbox"
        disabled
        trailing={<SheetRowBadge>Needs an account</SheetRowBadge>}
      />
      <SheetRow icon={<Bookmark size={ICON} />} label="Saved sites" onClick={onOpenSaved} />
      <SheetRow
        icon={<Compass size={ICON} />}
        label="Explore"
        disabled
        trailing={<SheetRowBadge>Coming soon</SheetRowBadge>}
      />
      <SheetRow icon={<Plus size={ICON} />} label="Post a link" onClick={onOpenSubmit} />
      <SheetRow
        icon={<ExternalLink size={ICON} />}
        label="Open current site"
        disabled={!site}
        onClick={() => {
          if (!site) return;
          window.open(site.url, "_blank", "noopener,noreferrer");
          onOpenChange(false);
        }}
      />
      <SheetRow
        icon={saved ? <BookmarkCheck size={ICON} /> : <Bookmark size={ICON} />}
        label={saved ? "Remove from saved" : "Save this site"}
        disabled={!site}
        onClick={() => {
          if (!site) return;
          const nowSaved = toggleSaved(site.id);
          toast(nowSaved ? "Saved" : "Removed from saved");
        }}
      />
      <SheetRow icon={<Palette size={ICON} />} label="Appearance" onClick={onOpenSettings} />
    </BaseSheet>
  );
}

// Signed out is the only state that exists until auth ships, so it is shown
// plainly rather than dressed up as a half-built account panel.
function GuestRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 46,
          height: 46,
          borderRadius: 999,
          background: "var(--app-chrome-avatar, #1f1f1f)",
          color: "var(--app-chrome-muted, #9c9c97)",
        }}
      >
        <User size={22} />
      </span>
      <span>
        <span
          style={{
            display: "block",
            fontSize: 17,
            fontWeight: 700,
            color: "var(--app-chrome-fg, #ffffff)",
          }}
        >
          Guest
        </span>
        <span style={{ display: "block", fontSize: 14, color: "var(--app-chrome-muted, #9c9c97)" }}>
          Everything here is saved on this device
        </span>
      </span>
    </div>
  );
}
