"use client";

import { useRef } from "react";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { FullscreenButton } from "@/components/show/stage/FullscreenButton";
import { ShowControlPanel } from "@/components/show/stage/ShowControlPanel";
import { ShowStage } from "@/components/show/stage/ShowStage";
import { useNotify } from "@/lib/hooks/common";
import { usePusherShowSync, useShowAudioHost, useShowControl, useShowKeys, useShowState } from "@/lib/hooks/show";

export function ShowPageClient({ campaignId, isDM }: { campaignId: string; isDM: boolean }) {
  const notify = useNotify();

  const stageRef = useRef<HTMLDivElement>(null);

  usePusherShowSync(campaignId);

  const { show } = useShowState(campaignId);

  const control = useShowControl(campaignId, notify);

  useShowKeys(isDM ? control : null);

  const host = useShowAudioHost({ campaignId, isDM, onFailure: notify });

  return (
    <AudioPlayerProvider host={host}>
      <div className="flex min-h-[calc(100dvh-var(--app-header-h))] flex-col">
        <div ref={stageRef} className="relative min-h-[60dvh] flex-1">
          <ShowStage show={show} />
          <div className="absolute right-3 top-3 z-20">
            <FullscreenButton target={stageRef} />
          </div>
          <div className="absolute bottom-3 left-3 z-30">
            <AudioDock placement="corner" />
          </div>
        </div>
        {isDM && <ShowControlPanel campaignId={campaignId} show={show} control={control} />}
      </div>
    </AudioPlayerProvider>
  );
}
