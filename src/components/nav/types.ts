import type { DiscoverySite } from "@/lib/discovery";

// Every slot is a user intent, not a UI mechanism. The names, positions and
// meanings are fixed -- muscle memory is a feature -- so this union is what
// analytics and any future slot behavior key off.
export type NavSlot = "menu" | "react" | "discover" | "send-to" | "submit";

// What a nav chrome (Classic or Modern) is handed. Both styles receive the
// SAME object, produced once by useNavActions, so a tap can never mean two
// different things depending on which bar is on screen.
export type NavSlots = {
  onMenuTap: () => void;
  onReactTap: () => void;
  onDiscoverTap: () => void;
  onSendToTap: () => void;
  onSubmitTap: () => void;
  /** The current site carries a reaction from this device. */
  reactActive: boolean;
  /** The current site is in this device's collection. */
  isSaved: boolean;
};

// Chrome-only decoration: glow pulses, the unread dot, and the refs the page
// uses to choreograph the brand mark. Nothing here changes what a slot does.
export type NavChromeProps = {
  glowMenu?: number | undefined;
  menuUnread?: boolean | undefined;
  glowSubmit?: number | undefined;
  logoRef?: React.Ref<HTMLSpanElement> | undefined;
  navRef?: React.Ref<HTMLElement> | undefined;
  /** Bumped by the page on a user-initiated advance: the mark spins. */
  logoSpinKey?: number | undefined;
  /** Bumped inside the bar when the site on screen is liked: the mark pulses.
   *  Not supplied by the page -- the like happens inside the reaction sheet,
   *  which the bar owns and the page never sees. */
  logoPulseKey?: number | undefined;
};

export type NavStyleProps = NavChromeProps & { slots: NavSlots };

export type BottomNavProps = NavChromeProps & {
  /** The site currently on screen; the sheets act on it. */
  site?: DiscoverySite | undefined;
  /** Advance to the next site. Owned by the page — the deck is its state. */
  onDiscover: () => void;
  /** Fired on every slot tap, before the sheet opens. Analytics lands here. */
  onSlotTap?: ((slot: NavSlot) => void) | undefined;
};
