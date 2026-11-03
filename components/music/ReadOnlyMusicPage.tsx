"use client";

import { useTranslations } from "next-intl";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { HudCard, HudPage, HudPageHeader } from "@/components/hud/page";
import { useNotify } from "@/lib/hooks/common";
import { useShowAudioHost } from "@/lib/hooks/show";
import { trackLink } from "@/lib/utils/audio/track-link";
import type { CampaignTrack } from "@/types/audio";

export function ReadOnlyMusicPage({ campaignId, tracks }: { campaignId: string; tracks: CampaignTrack[] }) {
  const t = useTranslations("music.demo");

  const notify = useNotify();

  const host = useShowAudioHost({ campaignId, isDM: true, onFailure: notify });

  return (
    <AudioPlayerProvider host={host}>
      <HudPage>
        <HudPageHeader title={t("title")} subtitle={t("subtitle")} />
        <AudioDock placement="corner" defaultExpanded />
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
    </AudioPlayerProvider>
  );
}
