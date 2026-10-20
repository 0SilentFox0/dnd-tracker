"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { ShowControlPanel } from "@/components/show/stage/ShowControlPanel";
import { useNotify } from "@/lib/hooks/common";
import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { useShowAudioHost } from "@/lib/hooks/show";
import type { ScenarioContent } from "@/types/scenario";

const STORAGE_KEY = "scenario-show-dock-expanded";

export const hasPlayBindings = (content: ScenarioContent) => content.sections.some((s) => s.rows.some((r) => r.slide || r.battleId));

function readExpanded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeExpanded(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {}
}

export function ScenarioShowDock({ campaignId, content, play }: { campaignId: string; content: ScenarioContent; play: ScenarioPlay }) {
  const { show } = play.lookup;

  if (!hasPlayBindings(content) && !show?.deckId && !show?.battle) return null;

  return <DockBody campaignId={campaignId} play={play} />;
}

function DockBody({ campaignId, play }: { campaignId: string; play: ScenarioPlay }) {
  const notify = useNotify();

  const host = useShowAudioHost({ campaignId, isDM: true, onFailure: notify });

  const [expanded, setExpanded] = useState(readExpanded);

  const { show } = play.lookup;

  const toggle = () => {
    writeExpanded(!expanded);
    setExpanded(!expanded);
  };

  const running = !!show?.deckId;

  return (
    <AudioPlayerProvider host={host}>
      <div className="sb-show-dock">
        <div className="sb-show-bar sans">
          <span className="sb-show-title">{running ? (show?.slide?.title ?? show?.deckTitle ?? "Слайд") : "Показ не запущено"}</span>
          <button type="button" className="toggle" aria-label="Попередній слайд" disabled={!running || play.pending} onClick={() => void play.control.send({ action: "prev" })}>
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" className="toggle" aria-label="Наступний слайд" disabled={!running || play.pending} onClick={() => void play.control.send({ action: "next" })}>
            <ChevronRight className="size-4" />
          </button>
          <button type="button" className="toggle" aria-expanded={expanded} aria-label={expanded ? "Згорнути панель показу" : "Розгорнути панель показу"} onClick={toggle}>
            {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>
        {expanded && (
          <>
            <div className="flex items-end gap-2 p-2">
              <AudioDock placement="corner" />
            </div>
            <ShowControlPanel campaignId={campaignId} show={show} control={play.control} />
          </>
        )}
      </div>
    </AudioPlayerProvider>
  );
}
