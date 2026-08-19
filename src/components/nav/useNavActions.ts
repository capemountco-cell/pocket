import { useCallback, useMemo } from "react";
import { Bookmark, Home, MessageCircle, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

export type NavSlot =
  | { kind: "button"; id: string; icon: LucideIcon; label: string; active: boolean; onPress: () => void }
  | { kind: "brand"; id: string; label: string; onPress: () => void };

/**
 * Single source of behaviour for every nav slot. Both nav styles consume this;
 * only their chrome differs.
 */
export function useNavActions(options: { onDiscover: () => void }): NavSlot[] {
  const { onDiscover } = options;

  const soon = useCallback((what: string) => {
    toast(`${what} arrives in a later pass.`);
  }, []);

  return useMemo<NavSlot[]>(
    () => [
      {
        kind: "button",
        id: "home",
        icon: Home,
        label: "Home",
        active: true,
        onPress: () => soon("Home"),
      },
      {
        kind: "button",
        id: "collections",
        icon: Bookmark,
        label: "Saved",
        active: false,
        onPress: () => soon("Collections"),
      },
      { kind: "brand", id: "discover", label: "Next", onPress: onDiscover },
      {
        kind: "button",
        id: "comments",
        icon: MessageCircle,
        label: "Talk",
        active: false,
        onPress: () => soon("Discussion"),
      },
      {
        kind: "button",
        id: "profile",
        icon: User,
        label: "You",
        active: false,
        onPress: () => soon("Your profile"),
      },
    ],
    [onDiscover, soon],
  );
}
