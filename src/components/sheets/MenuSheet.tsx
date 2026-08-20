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
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BaseSheet } from "@/components/ui/base-sheet";
import { SheetRow, SheetRowBadge } from "@/components/ui/sheet-row";
import { toggleSaved } from "@/lib/site-prefs";
import { recordEvent } from "@/lib/discovery";
import { getDeviceId } from "@/lib/device-id";
import { APP_NAME } from "@/lib/brand";
import type { DiscoverySite } from "@/lib/discovery";
import type { AuthState } from "@/lib/auth";

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
  onOpenAuth,
  auth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: DiscoverySite | undefined;
  saved: boolean;
  onOpenSaved: () => void;
  onOpenSubmit: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  auth: AuthState;
}) {
  const signedIn = Boolean(auth.session);
  const navigate = useNavigate();
  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${APP_NAME} menu`}
      header={<AccountRow auth={auth} onOpenAuth={onOpenAuth} />}
      footer={
        signedIn ? (
          <button
            type="button"
            onClick={() => {
              const deviceId = getDeviceId();
              if (deviceId) recordEvent(deviceId, "auth_signed_out");
              void auth.signOut().then(() => toast("Signed out"));
              onOpenChange(false);
            }}
            style={{
              ...FOOTER_BUTTON,
              background: "transparent",
              color: "var(--app-chrome-fg, #ffffff)",
              border: "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
            }}
          >
            Sign out
          </button>
        ) : (
          <button type="button" onClick={onOpenAuth} style={FOOTER_BUTTON}>
            Sign up &amp; log in
          </button>
        )
      }
    >
      <SheetRow
        icon={<Inbox size={ICON} />}
        label="Inbox"
        disabled={!signedIn}
        {...(signedIn ? {} : { trailing: <SheetRowBadge>Needs an account</SheetRowBadge> })}
      />
      <SheetRow
        icon={<Compass size={ICON} />}
        label="Explore"
        disabled
        trailing={<SheetRowBadge>Coming soon</SheetRowBadge>}
      />
      {/* The collection is a place, not a panel: it has a real URL so it can
          be linked and reached by back/forward. Navigated rather than wrapped
          in a link, because an anchor around a button is neither valid HTML
          nor reachable by keyboard. */}
      <SheetRow
        icon={<Bookmark size={ICON} />}
        label="Saved sites"
        onClick={() => {
          onOpenSaved();
          onOpenChange(false);
          void navigate({ to: "/saved" });
        }}
      />
      <SheetRow icon={<Plus size={ICON} />} label="Post a link" onClick={onOpenSubmit} />
      <SheetRow
        icon={<ExternalLink size={ICON} />}
        label="Open current site"
        disabled={!site}
        onClick={() => {
          if (!site) return;
          const deviceId = getDeviceId();
          if (deviceId) recordEvent(deviceId, "open_site", site.id);
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
          void toggleSaved(site).then((nowSaved) =>
            toast(nowSaved ? "Saved" : "Removed from saved"),
          );
        }}
      />
      <SheetRow icon={<Palette size={ICON} />} label="Appearance" onClick={onOpenSettings} />
    </BaseSheet>
  );
}

// Who you are, or an invitation to become someone. Signed out is a first-class
// state, not a broken one: everything in this menu except the inbox works
// without an account.
function AccountRow({ auth, onOpenAuth }: { auth: AuthState; onOpenAuth: () => void }) {
  const signedIn = Boolean(auth.session);
  const name =
    auth.profile?.display_name?.trim() ||
    auth.profile?.username?.trim() ||
    auth.profile?.email ||
    auth.user?.email ||
    "Guest";

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
          overflow: "hidden",
          flex: "0 0 auto",
        }}
      >
        {auth.profile?.avatar_url ? (
          <img
            src={auth.profile.avatar_url}
            alt=""
            width={46}
            height={46}
            style={{ width: 46, height: 46, objectFit: "cover" }}
          />
        ) : (
          <User size={22} />
        )}
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 17,
            fontWeight: 700,
            color: "var(--app-chrome-fg, #ffffff)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {auth.loading ? "\u2026" : name}
        </span>
        {signedIn ? (
          <span
            style={{ display: "block", fontSize: 14, color: "var(--app-chrome-muted, #9c9c97)" }}
          >
            Your saved sites follow you here
          </span>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              padding: 0,
              background: "transparent",
              border: 0,
              color: "var(--app-chrome-fg, #ffffff)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Create an account
          </button>
        )}
      </span>
    </div>
  );
}

const FOOTER_BUTTON: React.CSSProperties = {
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
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};
