"use client";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { ShowControlPanel } from "@/components/show/stage/ShowControlPanel";
import { useNotify } from "@/lib/hooks/common";
import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { useShowAudioHost } from "@/lib/hooks/show";

export function ScenarioShowDock({ campaignId, play }: { campaignId: string; play: ScenarioPlay }) {
  const notify = useNotify();

  const host = useShowAudioHost({ campaignId, isDM: true, onFailure: notify });

  return (
    <AudioPlayerProvider host={host}>
      <div className="sb-show-dock">
        <div className="flex items-end gap-2 p-2">
          <AudioDock placement="corner" />
        </div>
        <ShowControlPanel campaignId={campaignId} show={play.lookup.show} control={play.control} />
      </div>
    </AudioPlayerProvider>
  );
}
