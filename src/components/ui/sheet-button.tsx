import { SHEET_ROW_HEIGHT } from "@/components/ui/sheet-row";

// The action that sits at the foot of a sheet.
//
// One component rather than a copy per sheet, because the copies had already
// drifted: the menu and auth sheets used a white pill, while the submit sheet
// used a dark #161616 fill with a 14px radius -- the same intent wearing two
// different faces depending on which sheet you happened to be standing in,
// and the dark one nearly invisible against a black sheet once disabled.
//
// Primary is the filled pill: one per sheet, the thing the sheet exists to do.
// Secondary is the outlined one, for the action that undoes or steps away.
export type SheetButtonVariant = "primary" | "secondary";

export function SheetButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean | undefined;
  variant?: SheetButtonVariant | undefined;
}) {
  const primary = variant === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      style={{
        display: "flex",
        width: "100%",
        // Matches a row's height, so the footer reads as part of the same list
        // rather than a differently-scaled control bolted underneath it.
        minHeight: SHEET_ROW_HEIGHT - 4,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        border: primary ? 0 : "1px solid var(--app-chrome-border, rgba(255,255,255,0.14))",
        background: primary ? "var(--app-chrome-fg, #ffffff)" : "transparent",
        color: primary ? "var(--app-chrome-bg, #000000)" : "var(--app-chrome-fg, #ffffff)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 17,
        fontWeight: 700,
        // Dimming is the only disabled signal a filled pill can carry without
        // changing colour, so it is paired with the real disabled attribute
        // rather than standing in for it.
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}
