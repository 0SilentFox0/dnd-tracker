"use client";

import { useTranslations } from "next-intl";

import { TrackPicker } from "@/components/show/editor/TrackPicker";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export function SectionTrackDialog({ campaignId, value, open, onOpenChange, onPick }: { campaignId: string; value: string | undefined; open: boolean; onOpenChange(open: boolean): void; onPick(trackId: string | undefined): void }) {
  const t = useTranslations("scenario.sectionTrack");

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={t("pick")}>
      <TrackPicker
        campaignId={campaignId}
        value={value}
        onChange={(trackId) => {
          onPick(trackId);
          onOpenChange(false);
        }}
      />
    </ResponsiveDialog>
  );
}
