import type { IconName } from "./types";

// One entry per icon: the accent color it always renders in, and its path
// data on a shared 24x24 viewBox. Art is inline vector rather than a raster
// sheet, so AppIcon recolors by setting `fill` instead of masking — no crop
// math, and the glyph stays sharp at any size. When artwork changes, only
// this file changes and every consumer picks it up.
export const ICON_VIEWBOX = 24;

type IconEntry = {
  // Fill color for the symbol in every state (see AppIcon).
  accentColor: string;
  // Path data on a 24x24 grid, drawn as strokes with round caps/joins.
  paths: string[];
  strokeWidth?: number;
  // Sub-paths that should render filled rather than stroked.
  filled?: string[];
};

export const ICON_REGISTRY: Record<IconName, IconEntry> = {
  menu: {
    accentColor: "#00A2E8",
    paths: ["M3.75 7h16.5", "M3.75 12h16.5", "M3.75 17h16.5"],
  },
  react: {
    accentColor: "#2DD4BF",
    paths: [
      "M12 20.25c-.35 0-.69-.12-.96-.35C7.02 16.5 3.75 13.8 3.75 10.2a4.2 4.2 0 0 1 7.35-2.79c.24.27.66.27.9 0A4.2 4.2 0 0 1 20.25 10.2c0 3.6-3.27 6.3-7.29 9.7-.27.23-.61.35-.96.35Z",
    ],
  },
  "send-to": {
    accentColor: "#E5C800",
    paths: [
      "M20.5 3.5 3.9 10.4c-.6.25-.56 1.12.06 1.31l6.14 1.9 1.9 6.14c.19.62 1.06.66 1.31.06L20.5 3.5Z",
      "M20.5 3.5l-10.4 10.4",
    ],
  },
  notifications: {
    accentColor: "#E5C800",
    paths: [
      "M18 9a6 6 0 1 0-12 0c0 4.5-1.75 5.75-1.75 6.75h15.5C19.75 14.75 18 13.5 18 9Z",
      "M10 19a2.2 2.2 0 0 0 4 0",
    ],
  },
  submit: {
    accentColor: "#6A43D6",
    paths: ["M12 16.5V4.75", "M7.25 9.5 12 4.75l4.75 4.75", "M4.5 19.25h15"],
  },
};
