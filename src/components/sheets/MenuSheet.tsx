import { Bookmark, BookmarkCheck, Compass, ExternalLink, Inbox, Settings } from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { BaseSheet } from "@/components/ui/base-sheet";
import { AvatarButton } from "@/components/AvatarButton";
import { groupPin, pinFor } from "@/lib/pin";
import { writeClipboard } from "@/lib/utils";
import { SheetRow, SheetRowBadge } from "@/components/ui/sheet-row";
import { SheetButton } from "@/components/ui/sheet-button";
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
  onOpenSettings,
  onOpenAuth,
  onOpenInbox,
  auth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: DiscoverySite | undefined;
  saved: boolean;
  onOpenSaved: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenInbox: () => void;
  auth: AuthState;
}) {
  const signedIn = Boolean(auth.session);
  const navigate = useNavigate();
  // Which page the sheet is sitting over, so it can stop offering it.
  const here = useRouterState({ select: (state) => state.location.pathname });
  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${APP_NAME} menu`}
      hideTitle
      header={<AccountRow auth={auth} onOpenAuth={onOpenAuth} />}
      footer={
        signedIn ? (
          <SheetButton
            onClick={() => {
              const deviceId = getDeviceId();
              if (deviceId) recordEvent(deviceId, "auth_signed_out");
              void auth.signOut().then(() => toast("Signed out"));
              onOpenChange(false);
            }}
          >
            Sign out
          </SheetButton>
        ) : (
          <SheetButton onClick={onOpenAuth}>Sign up &amp; log in</SheetButton>
        )
      }
    >
      <SheetRow
        icon={<Inbox size={ICON} />}
        label="Inbox"
        disabled={!signedIn}
        {...(signedIn
          ? { onClick: onOpenInbox }
          : { trailing: <SheetRowBadge>Needs an account</SheetRowBadge> })}
      />
      {/* A row that navigates to the page you are standing on is a row that
          does nothing. Every other site-specific row already greys out when
          it has nothing to act on; these two were the exception. */}
      <SheetRow
        icon={<Compass size={ICON} />}
        label="Explore"
        disabled={here === "/explore"}
        onClick={() => {
          onOpenChange(false);
          void navigate({ to: "/explore" });
        }}
      />
      {/* The collection is a place, not a panel: it has a real URL so it can
          be linked and reached by back/forward. Navigated rather than wrapped
          in a link, because an anchor around a button is neither valid HTML
          nor reachable by keyboard. */}
      <SheetRow
        icon={<Bookmark size={ICON} />}
        label="History"
        disabled={here === "/history"}
        onClick={() => {
          onOpenSaved();
          onOpenChange(false);
          void navigate({ to: "/history" });
        }}
      />
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
        label={saved ? "Remove from history" : "Save this site"}
        disabled={!site}
        onClick={() => {
          if (!site) return;
          void toggleSaved(site).then((nowSaved) =>
            toast(nowSaved ? "Saved" : "Removed from history"),
          );
        }}
      />
      <SheetRow icon={<Settings size={ICON} />} label="Settings" onClick={onOpenSettings} />
    </BaseSheet>
  );
}

/**
 * Your PIN, under your name, where the account blurb used to be.
 *
 * The line it replaced -- "Your history follows you here" -- was reassurance,
 * and reassurance is worth saying once rather than every time the menu opens.
 * This is the thing someone actually needs off this screen: the number they
 * read out so a friend can find them.
 *
 * Tapping copies the bare digits. Anyone showing a PIN to someone is about to
 * type it somewhere, and the copy is free.
 */
function PinLine({ accountId }: { accountId: string }) {
  const pin = pinFor(accountId);
  if (!pin) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void writeClipboard(pin).then((ok) =>
          toast(ok ? "PIN copied" : "Couldn't reach the clipboard"),
        );
      }}
      aria-label={`Your PIN, ${pin.split("").join(" ")}. Tap to copy.`}
      style={{
        display: "block",
        // Same trick as the sign-in link below: the padding takes the hit area
        // to 44px and the equal negative margin hands the space straight back,
        // so the header looks untouched and the thumb still has somewhere to
        // land.
        padding: "12px 0",
        margin: "-12px 0",
        background: "transparent",
        border: 0,
        textAlign: "left",
        color: "var(--app-chrome-muted, #9c9c97)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 14,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      PIN{" "}
      <span
        style={{
          color: "var(--app-chrome-fg, #ffffff)",
          fontWeight: 600,
          // Tabular figures so the digits do not shuffle sideways between one
          // account and the next, and a little tracking because a number being
          // read aloud is easier to keep your place in when it is open.
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.06em",
        }}
      >
        {groupPin(pin)}
      </span>
    </button>
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
    // Name first, picture last. Every row under this one starts at the same
    // left edge, and an avatar in front of the name was the one thing indenting
    // past it -- so the column now reads straight down and the face sits out on
    // the right where it is decoration rather than a false first column.
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>
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
          <PinLine accountId={auth.user?.id ?? auth.profile?.id ?? ""} />
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            style={{
              // 16px of text is a miss waiting to happen. The padding takes
              // the hit area to 44px and the equal negative margin gives the
              // space straight back, so the row looks untouched and the thumb
              // gets somewhere to land.
              padding: "14px 0",
              margin: "-14px 0",
              background: "transparent",
              border: 0,
              // No underline, so full white and a heavier weight are what
              // separate this from the muted line it replaces. It is the only
              // thing in the header that is not the name, and it is doing the
              // work of a link without looking like one.
              color: "var(--app-chrome-fg, #ffffff)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Create an account
          </button>
        )}
      </span>

      {/* Signed in, the face is the control: one tap opens the picture
          picker. Signed out it stays a plain circle -- see AvatarButton. */}
      <AvatarButton auth={auth} size={46} />
    </div>
  );
}
