"use client";

import { useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";

import { HudCard, HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useTrackPreview } from "@/lib/hooks/music";
import { trackLink } from "@/lib/utils/audio/track-link";
import type { CampaignTrack } from "@/types/audio";

export function ReadOnlyMusicPage({ tracks }: { tracks: CampaignTrack[] }) {
  const t = useTranslations();

  const preview = useTrackPreview();

  const firstLinked = tracks.findIndex((track) => trackLink(track));

  return (
    <HudPage>
      <HudPageHeader title={t("music.demo.title")} subtitle={t("music.demo.subtitle")} />
      <ol data-tour="music.library" className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track, i) => {
          const href = trackLink(track);

          const playing = preview.playingId === track.id;

          const failed = preview.failedId === track.id;

          return (
            <HudCard key={track.id} asChild tone={playing ? "active" : "default"}>
              <li className="flex min-w-0 items-center gap-2">
                <Button data-tour={i === 0 ? "music.play" : undefined} variant="ghost" size="icon" aria-label={t(playing ? "music.list.pause" : "music.list.play")} aria-pressed={playing} onClick={() => preview.toggle(track)}>
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{track.title}</p>
                  {href && <a data-tour={i === firstLinked ? "music.source" : undefined} href={href} target="_blank" rel="noreferrer noopener" className="block truncate text-xs text-hud-muted underline-offset-2 hover:underline">{href.replace(/^https?:\/\//, "")}</a>}
                  {failed && <span role="alert" className="text-xs text-[var(--enemy)]">{t("music.list.playFailed")}</span>}
                  {playing && preview.progress !== null && <div role="progressbar" aria-label={t("music.list.progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(preview.progress * 100)} className="mt-1 h-1 overflow-hidden rounded bg-white/10"><div className="h-full bg-hud-gold" style={{ width: `${preview.progress * 100}%` }} /></div>}
                </div>
              </li>
            </HudCard>
          );
        })}
      </ol>
    </HudPage>
  );
}
