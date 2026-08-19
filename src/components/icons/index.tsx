import { AppIcon } from "./AppIcon";
import type { IconState } from "./types";

export { AppIcon } from "./AppIcon";
export { ICON_REGISTRY } from "./registry";
export type { IconName, IconState } from "./types";

export type SemanticIconProps = {
  state?: IconState | undefined;
  size?: number | undefined;
  glowKey?: number | undefined;
  className?: string | undefined;
};

// Semantic, swap-friendly names for each nav icon. Every export below is a
// thin wrapper over AppIcon so call sites never reference raw art or a
// positional name like "Icon001" — when the artwork changes, only
// registry.ts needs to change.
export function MenuIcon(props: SemanticIconProps) {
  return <AppIcon name="menu" {...props} />;
}

export function ReactIcon(props: SemanticIconProps) {
  return <AppIcon name="react" {...props} />;
}

export function SendToIcon(props: SemanticIconProps) {
  return <AppIcon name="send-to" {...props} />;
}

// Reserved for the comments / live discussion feature. Wired into the icon
// system so it's ready, but intentionally not in any nav slot yet.
export function NotificationsIcon(props: SemanticIconProps) {
  return <AppIcon name="notifications" {...props} />;
}

export function SubmitIcon(props: SemanticIconProps) {
  return <AppIcon name="submit" {...props} />;
}
