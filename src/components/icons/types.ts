// Visual states a nav icon can be rendered in. Purely presentational —
// components in this folder never decide *when* a state applies, they just
// animate in response to whatever the caller passes.
export type IconState = "idle" | "pressed" | "active" | "disabled" | "loading" | "success";

// Every custom icon the app currently ships. Add new entries here first, then
// wire the art in registry.ts — everything else (semantic components, nav
// buttons) is keyed off this union so a typo fails to compile instead of
// silently rendering nothing.
export type IconName = "menu" | "react" | "send-to" | "notifications" | "submit";
