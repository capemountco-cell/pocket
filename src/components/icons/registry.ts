import menuUrl from "@/assets/icons/menu.png";
import reactUrl from "@/assets/icons/react.png";
import sendToUrl from "@/assets/icons/send-to.png";
import notificationsUrl from "@/assets/icons/notifications.png";
import submitUrl from "@/assets/icons/submit.png";
import type { IconName } from "./types";

// The five source files are raster sheets (512x512, transparent background)
// that bake a mascot glyph and its accent symbol into one flat image. The nav
// renders ONLY the accent symbol -- the mascot figure is deliberately not in
// the bar -- so `accent` below is the pixel-space bounding box of each symbol
// within the shared 512x512 canvas. AppIcon uses it to crop and zoom the
// symbol to a consistent visual size and recolor it. When single-glyph vector
// art lands, the crop step goes away and only `src`/`accentColor` matter.
export const ICON_SOURCE_SIZE = 512;

type IconCrop = { x: number; y: number; w: number; h: number };

type IconEntry = {
  src: string;
  // Fill color for the symbol in every state (see AppIcon).
  accentColor: string;
  accent: IconCrop;
};

// Accent palette drawn from the logo's blue -> cyan -> green gradient. Blue
// and Purple come straight from the theme ramp in src/lib/theme.ts so the bar
// stays consistent with color used elsewhere. Send-to shares Notifications'
// gold so the two read as one tonality.
export const ICON_REGISTRY: Record<IconName, IconEntry> = {
  menu: {
    src: menuUrl,
    accentColor: "#00A2E8",
    accent: { x: 354, y: 107, w: 120, h: 88 },
  },
  react: {
    src: reactUrl,
    accentColor: "#2DD4BF",
    accent: { x: 355, y: 91, w: 136, h: 113 },
  },
  "send-to": {
    src: sendToUrl,
    accentColor: "#E5C800",
    accent: { x: 360, y: 94, w: 124, h: 102 },
  },
  notifications: {
    src: notificationsUrl,
    accentColor: "#E5C800",
    accent: { x: 400, y: 69, w: 104, h: 112 },
  },
  submit: {
    src: submitUrl,
    accentColor: "#6A43D6",
    accent: { x: 355, y: 97, w: 124, h: 122 },
  },
};
