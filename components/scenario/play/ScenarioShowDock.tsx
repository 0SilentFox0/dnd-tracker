"use client";

import { ChevronDown, ChevronUp, Crosshair, EyeOff, SkipForward } from "lucide-react";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ShowButton } from "@/components/show/stage/show-ui";
import { ShowDeckStrip } from "@/components/show/stage/ShowDeckStrip";
import { ShowTransport } from "@/components/show/stage/ShowTransport";
import { useNotify } from "@/lib/hooks/common";
import { type ScenarioPlay, useShowDockExpanded } from "@/lib/hooks/scenario";
import { useShowAudioHost, useShowKeys } from "@/lib/hooks/show";
import { hasPlayBindings } from "@/lib/utils/scenario/play";
import { showsCover, visibleSlide } from "@/lib/utils/show/player-view";
import type { ScenarioContent } from "@/types/scenario";
import type { ShowState } from "@/types/show";

const scrollToRow = (rowId: string) => document.getElementById(`row-${rowId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

export function ScenarioShowDock({ campaignId, pageId, content, play }: { campaignId: string; pageId: string; content: ScenarioContent; play: ScenarioPlay }) {
  const { show } = play.lookup;

  if (!hasPlayBindings(content) && !show?.deckId && !show?.battle) return null;

  return <DockBody campaignId={campaignId} pageId={pageId} play={play} />;
}

/** Що зараз бачать гравці. */
function OnScreen({ show }: { show: ShowState | null }) {
  const cover = showsCover(show);

  const image = visibleSlide(show)?.imageUrl;

  const label = show?.battle ? `⚔ До бою: ${show.battle.name}` : cover ? (show?.deckId ? "Заглушка" : "Показ не запущено") : (show?.slide?.title ?? show?.deckTitle ?? "Слайд");

  return (
    <div className="sb-show-now" data-curtain={(cover && !!show?.deckId) || undefined}>
      {image ? <OptimizedImage src={image} alt="" width={64} height={36} className="sb-thumb" /> : <span className="sb-thumb sb-show-thumb-empty">{cover && <EyeOff className="size-4" />}</span>}
      <span className="sb-show-title">{label}</span>
    </div>
  );
}

function DockBody({ campaignId, pageId, play }: { campaignId: string; pageId: string; play: ScenarioPlay }) {
  const notify = useNotify();

  const host = useShowAudioHost({ campaignId, isDM: true, onFailure: notify });

  const [expanded, setExpanded] = useShowDockExpanded();

  const { show } = play.lookup;

  const nextRow = () => {
    if (!play.nextRow) return;

    play.showSlide(play.nextRow);
    scrollToRow(play.nextRow.id);
  };

  const current = play.currentRow;

  useShowKeys(play.control, { KeyN: nextRow });

  return (
    <AudioPlayerProvider host={host}>
      <div className="sb-show-dock">
        <div className="sb-show-audio">
          <AudioDock placement="corner" defaultExpanded={false} />
        </div>
        <div className="sb-show-bar sans">
          <OnScreen show={show} />
          <ShowTransport campaignId={campaignId} show={show} control={play.control} />
          <ShowButton title={play.nextRow ? "Показати слайд наступного рядка (N)" : "Далі в сценарії слайдів немає"} disabled={play.pending || !play.nextRow} onClick={nextRow}>
            <SkipForward className="size-4" />
            <span className="max-md:sr-only">Наступний рядок</span>
          </ShowButton>
          {current && (
            <ShowButton aria-label="До рядка зі слайдом" title="До рядка зі слайдом" onClick={() => scrollToRow(current.id)}>
              <Crosshair className="size-4" />
            </ShowButton>
          )}
          {show?.nextImageUrl && (
            <span className="sb-show-next" title="Наступний слайд набору">
              далі <OptimizedImage src={show.nextImageUrl} alt="" width={64} height={36} className="sb-show-thumb-sm" />
            </span>
          )}
          <ShowButton className="ml-auto" aria-expanded={expanded} aria-label={expanded ? "Згорнути панель показу" : "Розгорнути панель показу"} onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            <span className="max-md:sr-only">Слайди</span>
          </ShowButton>
        </div>
        {expanded && (
          <div className="sb-show-body sans">
            <ShowDeckStrip campaignId={campaignId} show={show} control={play.control} sceneId={pageId} />
          </div>
        )}
      </div>
    </AudioPlayerProvider>
  );
}
