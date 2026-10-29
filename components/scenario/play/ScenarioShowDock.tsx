"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, EyeOff, SkipForward } from "lucide-react";

import { AudioDock } from "@/components/audio/AudioDock";
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ShowButton } from "@/components/show/stage/show-ui";
import { ShowDeckStrip } from "@/components/show/stage/ShowDeckStrip";
import { ShowTransport } from "@/components/show/stage/ShowTransport";
import { ShowWorldControls } from "@/components/world/show/ShowWorldControls";
import { useNotify } from "@/lib/hooks/common";
import { type ScenarioPlay, useShowDockExpanded } from "@/lib/hooks/scenario";
import { useShowAudioHost, useShowKeys } from "@/lib/hooks/show";
import { useWorldMaps } from "@/lib/hooks/world";
import { hasPlayBindings } from "@/lib/utils/scenario/play";
import { showsCover, visibleSlide } from "@/lib/utils/show/player-view";
import type { ScenarioContent } from "@/types/scenario";
import type { ShowState } from "@/types/show";

const scrollToRow = (rowId: string) => document.getElementById(`row-${rowId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

export function ScenarioShowDock({ campaignId, pageId, content, play }: { campaignId: string; pageId: string; content: ScenarioContent; play: ScenarioPlay }) {
  const { show } = play.lookup;

  if (!hasPlayBindings(content) && !show?.deckId && !show?.battle && !show?.world) return null;

  return <DockBody campaignId={campaignId} pageId={pageId} play={play} />;
}

/** Що зараз бачать гравці; клік — до рядка зі слайдом. */
function OnScreen({ campaignId, show, onLocate }: { campaignId: string; show: ShowState | null; onLocate?: () => void }) {
  const t = useTranslations("scenario.dock");

  const { data: maps } = useWorldMaps(campaignId);

  const cover = showsCover(show);

  const image = visibleSlide(show)?.imageUrl;

  const mapName = show?.world && maps?.find((m) => m.id === show.world?.mapId)?.name;

  const label = show?.battle ? t("battle", { name: show.battle.name }) : show?.world && !show.curtain ? (mapName ? t("mapNamed", { name: mapName }) : t("map")) : cover ? (show?.deckId ? t("curtain") : t("notRunning")) : (show?.slide?.title ?? show?.deckTitle ?? t("slide"));

  return (
    <button type="button" className="sb-show-now" data-curtain={(cover && !!show?.deckId) || undefined} disabled={!onLocate} title={onLocate ? t("locate") : undefined} onClick={onLocate}>
      {image ? <OptimizedImage src={image} alt="" width={64} height={36} className="sb-thumb" /> : <span className="sb-thumb sb-show-thumb-empty">{cover && <EyeOff className="size-4" />}</span>}
      <span className="sb-show-title">{label}</span>
    </button>
  );
}

function DockBody({ campaignId, pageId, play }: { campaignId: string; pageId: string; play: ScenarioPlay }) {
  const t = useTranslations("scenario.dock");

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
        <div className="sb-show-bar sans">
          <OnScreen campaignId={campaignId} show={show} onLocate={current ? () => scrollToRow(current.id) : undefined} />
          <div className="sb-show-controls">
            <div className="sb-show-audio">
              <AudioDock placement="corner" defaultExpanded={false} />
            </div>
            <ShowTransport campaignId={campaignId} show={show} control={play.control} />
            <ShowButton aria-label={t("nextRow")} title={play.nextRow ? t("nextRowHint") : t("noMoreSlides")} disabled={play.pending || !play.nextRow} onClick={nextRow}>
              <SkipForward className="size-4" />
            </ShowButton>
            <ShowButton aria-expanded={expanded} aria-label={expanded ? t("collapse") : t("expand")} title={expanded ? t("hideSlides") : t("slides")} onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </ShowButton>
          </div>
        </div>
        {expanded && (
          <div className="sb-show-body sans">
            <ShowDeckStrip campaignId={campaignId} show={show} control={play.control} sceneId={pageId} />
            <ShowWorldControls campaignId={campaignId} show={show} control={play.control} />
          </div>
        )}
      </div>
    </AudioPlayerProvider>
  );
}
