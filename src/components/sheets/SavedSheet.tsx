import { ExternalLink, Trash2 } from "lucide-react";
import { BaseSheet } from "@/components/ui/base-sheet";
import { SheetRow } from "@/components/ui/sheet-row";
import { toggleSaved } from "@/lib/site-prefs";
import type { DiscoverySite } from "@/lib/discovery";

// The device's collection. Empty is a real state with its own copy, not a
// blank panel -- it's the state most people see first.
export function SavedSheet({
  open,
  onOpenChange,
  sites,
  onShowSite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: DiscoverySite[];
  onShowSite: (site: DiscoverySite) => void;
}) {
  return (
    <BaseSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Saved sites"
      eyebrow="Saved"
      size={sites.length > 4 ? "half" : "auto"}
    >
      {sites.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: "18px 20px 26px",
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--app-chrome-muted, #9c9c97)",
          }}
        >
          Nothing saved yet. Tap the send icon on a site you want to keep, then choose “Save this
          site”.
        </p>
      ) : (
        sites.map((site) => (
          <SheetRow
            key={site.id}
            icon={<ExternalLink size={21} />}
            label={site.title}
            onClick={() => {
              onShowSite(site);
              onOpenChange(false);
            }}
            action={{
              icon: <Trash2 size={18} aria-hidden="true" />,
              label: `Remove ${site.title} from saved`,
              onClick: () => void toggleSaved(site),
            }}
          />
        ))
      )}
    </BaseSheet>
  );
}
