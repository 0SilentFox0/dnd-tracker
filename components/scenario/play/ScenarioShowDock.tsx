"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { ShowControlPanel } from "@/components/show/stage/ShowControlPanel";
import { useNotify } from "@/lib/hooks/common";
import { type ScenarioPlay, useShowDockExpanded } from "@/lib/hooks/scenario";
import { useShowAudioHost } from "@/lib/hooks/show";
import { hasPlayBindings } from "@/lib/utils/scenario/play";
import type { ScenarioContent } from "@/types/scenario";

export function ScenarioShowDock({ campaignId, content, play }: { campaignId: string; content: ScenarioContent; play: ScenarioPlay }) {
  const { show } = play.lookup;

  if (!hasPlayBindings(content) && !show?.deckId && !show?.battle) return null;

  return <DockBody campaignId={campaignId} play={play} />;
}

function DockBody({ campaignId, play }: { campaignId: string; play: ScenarioPlay }) {
  const notify = useNotify();

  const host = useShowAudioHost({ campaignId, isDM: true, onFailure: notify });

  const [expanded, setExpanded] = useShowDockExpanded();

  const { show } = play.lookup;

  const running = !!show?.deckId;

  return (
    <AudioPlayerProvider host={host}>
      <div className="sb-show-dock">
        <div className="sb-show-bar sans">
          <span className="sb-show-title">{running ? (show?.slide?.title ?? show?.deckTitle ?? "Слайд") : show?.battle ? `⚔ ${show.battle.name}` : "Показ не запущено"}</span>
          <button type="button" className="toggle" aria-label="Попередній слайд" disabled={!running || play.pending} onClick={() => void play.control.send({ action: "prev" })}>
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" className="toggle" aria-label="Наступний слайд" disabled={!running || play.pending} onClick={() => void play.control.send({ action: "next" })}>
            <ChevronRight className="size-4" />
          </button>
          <button type="button" className="toggle" aria-expanded={expanded} aria-label={expanded ? "Згорнути панель показу" : "Розгорнути панель показу"} onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>
        {expanded && (
          <div className="sb-show-body">
            <div className="sb-show-audio">
              <AudioDock placement="corner" defaultExpanded={false} />
            </div>
            <div className="sb-show-controls">
              <ShowControlPanel campaignId={campaignId} show={show} control={play.control} />
            </div>
          </div>
        )}
      </div>
    </AudioPlayerProvider>
  );
}
