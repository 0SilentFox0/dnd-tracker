"use client";

import { useTranslations } from "next-intl";
import { Music, Play } from "lucide-react";

import { useTracks } from "@/lib/hooks/music";

export function SectionTrackChip({ campaignId, trackId, onPlay, disabled }: { campaignId: string; trackId: string; onPlay?: () => void; disabled?: boolean }) {
  const t = useTranslations("scenario.sectionTrack");

  const { data: tracks } = useTracks(campaignId);

  const track = tracks?.find((x) => x.id === trackId);

  return (
    <span className="sb-bind">
      <Music className="size-4 shrink-0" />
      <span className="sb-bind-name">{track?.title ?? (tracks ? t("missing") : t("loading"))}</span>
      {onPlay && track && (
        <button type="button" className="toggle" aria-label={t("play")} disabled={disabled} onClick={onPlay}>
          <Play className="size-3" /> {t("play")}
        </button>
      )}
    </span>
  );
}
