export type BottomNavProps = {
  onNav: () => void;
  onReact: () => void;
  onDiscover: () => void;
  onSendTo: () => void;
  onSubmit: () => void;
  siteUrl?: string | undefined;
  siteTitle?: string | undefined;
  isSaved?: boolean | undefined;
  reactActive?: boolean | undefined;
  glowMenu?: number | undefined;
  menuUnread?: boolean | undefined;
  glowSubmit?: number | undefined;
  logoRef?: React.Ref<HTMLSpanElement> | undefined;
  navRef?: React.Ref<HTMLElement> | undefined;
  logoPulseKey?: number | undefined;
};
