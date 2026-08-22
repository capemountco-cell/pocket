import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useSitePrefs, type ReactionKind } from "@/lib/site-prefs";
import { recordEvent, type EventKind } from "@/lib/discovery";
import { getDeviceId } from "@/lib/device-id";
import type { BottomNavProps, NavSlot, NavSlots } from "./types";

// Which sheet a slot opens. Closed union so a typo fails to compile rather
// than silently opening nothing.
export type SheetKey =
  "menu" | "reaction" | "comments" | "send-to" | "submit" | "settings" | "saved" | "auth" | "inbox";

// The single source of truth for what a tap on each slot actually does.
// Called ONCE, by BottomNav, so ClassicNav and ModernNav are handed the same
// handlers rather than each building their own -- slot behavior can never
// fork between the two styles. Sheet state lives here too, which is why
// BottomNav (not the bar) renders the sheets: a sheet nested inside the bar
// would open inside it.
export function useNavActions(props: BottomNavProps) {
  const { site, onDiscover, onSlotTap } = props;
  const prefs = useSitePrefs();
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);

  // Tapping a slot whose sheet is already open closes it: the slot is a
  // toggle, so the same tap that opened a sheet always takes it away again.
  const open = useCallback(
    (sheet: SheetKey, slot: NavSlot) => () => {
      onSlotTap?.(slot);
      setActiveSheet((activeSheet) => (activeSheet === sheet ? null : sheet));
    },
    [onSlotTap],
  );

  const closeSheet = useCallback(() => setActiveSheet(null), []);

  // Saying no moves you on. "Not for me", "Don't show this again" and "Report
  // spam" all mean the same thing about the site on screen -- you are done
  // with it -- so leaving it up afterwards makes the tap look like it failed.
  // A like is the one that stays: you liked it, you are presumably still
  // looking at it, and the mark pulses instead.
  const onReacted = useCallback(
    (kind: ReactionKind) => {
      if (kind === "like") return;
      if (kind === "hidden") toast("You won't see this site again");
      else if (kind === "report") toast("Thanks — reported for review");
      onDiscover();
    },
    [onDiscover],
  );

  // Liking the site on screen flashes the brand mark. Derived here rather than
  // handed down from the page: the like is made inside the reaction sheet,
  // which this hook owns and the page never sees.
  //
  // The site id is part of the comparison because reactions are per site --
  // advancing onto something this device liked earlier flips `liked` from
  // false to true without anyone having pressed anything, and that is not a
  // moment to celebrate.
  const [logoPulseKey, setLogoPulseKey] = useState(0);
  const liked = site ? prefs.reactions[site.id] === "like" : false;
  const lastLike = useRef<{ id: string | undefined; liked: boolean }>({
    id: site?.id,
    liked,
  });
  useEffect(() => {
    const id = site?.id;
    if (lastLike.current.id === id && liked && !lastLike.current.liked) {
      setLogoPulseKey((k) => k + 1);
    }
    lastLike.current = { id, liked };
  }, [liked, site?.id]);

  // Sheets reached from inside another sheet are real decisions too, so they
  // are recorded on the same path as the slots that open them.
  const openFromSheet = useCallback((sheet: SheetKey, kind: EventKind, siteId?: string) => {
    const deviceId = getDeviceId();
    // The site goes with the event where the handoff is about one: "comments
    // opened" is worth much more attached to the site it was opened on.
    if (deviceId) recordEvent(deviceId, kind, siteId);
    setActiveSheet(sheet);
  }, []);

  const slots: NavSlots = useMemo(
    () => ({
      onMenuTap: open("menu", "menu"),
      onReactTap: open("reaction", "react"),
      onSendToTap: open("send-to", "send-to"),
      onSubmitTap: open("submit", "submit"),
      onDiscoverTap: () => {
        onSlotTap?.("discover");
        // Advancing changes the subject. Every sheet is about the site on
        // screen -- its reactions, its share targets, the menu's save row --
        // so leaving one open over the *next* site leaves it describing
        // something that is no longer there. The bar stays tappable while a
        // sheet is open (that is deliberate), which is exactly why this has
        // to close it: without this line the tap lands, the site changes
        // underneath, and the sheet just sits there.
        setActiveSheet(null);
        onDiscover();
      },
      reactActive: site ? prefs.reactions[site.id] === "like" : false,
      siteActionsDisabled: !site,
      isSaved: site ? prefs.savedIds.includes(site.id) : false,
      commentCount: site?.commentCount ?? 0,
    }),
    [open, onDiscover, onSlotTap, prefs, site],
  );

  return { slots, activeSheet, closeSheet, openFromSheet, prefs, logoPulseKey, onReacted };
}
