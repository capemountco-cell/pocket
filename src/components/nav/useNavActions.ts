import type { BottomNavProps } from "./types";

// The single source of truth for what a tap on each slot actually does.
// ClassicNav and ModernNav both consume this — never fork slot behavior
// between the two styles; extend this hook instead. Sheets and analytics
// land here as they ship, so only this file changes when they do.
export function useNavActions(props: BottomNavProps) {
  const { onNav, onReact, onSendTo, onSubmit } = props;

  return {
    handleMenuTap: onNav,
    handleReactTap: onReact,
    handleSendToTap: onSendTo,
    handleSubmitTap: onSubmit,
  };
}
