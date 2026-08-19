import { MenuSheet } from "@/components/sheets/MenuSheet";
import { ReactionSheet } from "@/components/sheets/ReactionSheet";
import { SendToSheet } from "@/components/sheets/SendToSheet";
import { SubmitSheet } from "@/components/sheets/SubmitSheet";
import { SettingsSheet } from "@/components/sheets/SettingsSheet";
import { SavedSheet } from "@/components/sheets/SavedSheet";
import { AuthSheet } from "@/components/sheets/AuthSheet";
import { useAuth } from "@/lib/auth";
import type { SitePrefs } from "@/lib/site-prefs";
import type { DiscoverySite } from "@/lib/discovery";
import type { EventKind } from "@/lib/discovery";
import type { SheetKey } from "./useNavActions";

// Every sheet the bottom bar can open, in one place, driven by a single
// `activeSheet` value -- so two sheets can never be open at once and a row in
// one sheet can hand off to another by naming it.
export function NavSheets({
  activeSheet,
  openFromSheet,
  closeSheet,
  site,
  prefs,
  savedSites,
  isSaved,
  onShowSite,
}: {
  activeSheet: SheetKey | null;
  openFromSheet: (sheet: SheetKey, kind: EventKind) => void;
  closeSheet: () => void;
  site: DiscoverySite | undefined;
  prefs: SitePrefs;
  savedSites: DiscoverySite[];
  isSaved: boolean;
  onShowSite: (site: DiscoverySite) => void;
}) {
  // Who is signed in, read once here and handed to the sheets that show it,
  // so two sheets can never disagree about it.
  const auth = useAuth();

  // BaseSheet's own close paths (drag, Escape, backdrop, close button) all
  // report through onOpenChange, so closing is expressed once per sheet.
  const bind = (key: SheetKey) => ({
    open: activeSheet === key,
    onOpenChange: (next: boolean) => {
      if (!next) closeSheet();
    },
  });

  return (
    <>
      <MenuSheet
        {...bind("menu")}
        site={site}
        saved={isSaved}
        onOpenSaved={() => openFromSheet("saved", "bookmarks_open")}
        onOpenSubmit={() => openFromSheet("submit", "submit_open")}
        onOpenSettings={() => openFromSheet("settings", "preferences_open")}
        onOpenAuth={() => openFromSheet("auth", "auth_open")}
        auth={auth}
      />
      <ReactionSheet
        {...bind("reaction")}
        site={site}
        {...(site && prefs.reactions[site.id] ? { current: prefs.reactions[site.id] } : {})}
      />
      <SendToSheet
        {...bind("send-to")}
        site={site}
        saved={isSaved}
        onOpenSaved={() => openFromSheet("saved", "bookmarks_open")}
      />
      <SubmitSheet {...bind("submit")} />
      <SettingsSheet {...bind("settings")} />
      <SavedSheet {...bind("saved")} sites={savedSites} onShowSite={onShowSite} />
      <AuthSheet {...bind("auth")} />
    </>
  );
}
