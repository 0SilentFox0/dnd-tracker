"use client";

import { useTranslations } from "next-intl";

import { HudCard, HudPage, HudPageHeader } from "@/components/hud/page";
import { trackLink } from "@/lib/utils/audio/track-link";
import type { CampaignTrack } from "@/types/audio";

export function ReadOnlyMusicPage({ tracks }: { tracks: CampaignTrack[] }) {
  const t = useTranslations("music.demo");

  return (
    <HudPage>
      <HudPageHeader title={t("title")} subtitle={t("subtitle")} />
      <ol className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track) => {
          const href = trackLink(track);

          return (
            <HudCard key={track.id} asChild>
              <li>{href ? <a href={href} target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">{track.title}</a> : track.title}</li>
            </HudCard>
          );
        })}
      </ol>
    </HudPage>
  );
}
