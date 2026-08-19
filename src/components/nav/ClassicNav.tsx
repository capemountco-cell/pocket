import { NAV_BAR_HEIGHT, NAV_Z_INDEX, SAFE_BOTTOM_PAD } from "@/lib/nav-style";
import { BrandMark } from "./BrandMark";
import { NavButton } from "./NavButton";
import type { NavSlot } from "./useNavActions";

/** Full-width fixed bar. Chrome only — behaviour comes from useNavActions. */
export function ClassicNav({ slots }: { slots: NavSlot[] }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 border-t"
      style={{
        zIndex: NAV_Z_INDEX,
        backgroundColor: "var(--app-chrome-bg)",
        borderColor: "var(--app-border)",
        paddingBottom: SAFE_BOTTOM_PAD,
      }}
    >
      <ul
        className="grid grid-cols-[1fr_1fr_1.65fr_1fr_1fr] items-center px-1"
        style={{ minHeight: NAV_BAR_HEIGHT }}
      >
        {slots.map((slot) => (
          <li key={slot.id} className="flex justify-center">
            {slot.kind === "brand" ? (
              <BrandMark label={slot.label} onPress={slot.onPress} />
            ) : (
              <NavButton
                icon={slot.icon}
                label={slot.label}
                active={slot.active}
                onPress={slot.onPress}
              />
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
