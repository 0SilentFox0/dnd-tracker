"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MapPin, Play, Swords } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { MarkerChip } from "@/components/scenario/MarkerChip";
import { BattleStatus } from "@/lib/constants/battle";
import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { useTranslator } from "@/lib/i18n/use-translator";
import { battleAction, markerOnScreen, rowBattleState, rowSlideState } from "@/lib/utils/scenario/play";
import type { ScenarioMarkerRef, ScenarioRow } from "@/types/scenario";

export function MarkerPlay({ campaignId, marker, play }: { campaignId: string; marker: ScenarioMarkerRef; play: ScenarioPlay }) {
  const t = useTranslations("scenario.play");

  const onScreen = markerOnScreen(marker, play.lookup.show);

  return (
    <MarkerChip
      campaignId={campaignId}
      marker={marker}
      action={(available) =>
        onScreen ? (
          <span className="sb-bind-live">{t("onScreen")}</span>
        ) : (
          <button type="button" className="toggle" aria-label={t("showOnMap")} disabled={!available || play.pending} onClick={() => play.showMarker(marker)}>
            <MapPin className="size-3" /> {t("showOnMap")}
          </button>
        )
      }
    />
  );
}

export function RowPlayControls({ campaignId, row, play }: { campaignId: string; row: ScenarioRow; play: ScenarioPlay }) {
  const t = useTranslations("scenario.play");

  const tAll = useTranslator();

  const slide = rowSlideState(row, play.lookup);

  const battle = rowBattleState(row, play.lookup);

  const action = battleAction(battle);

  if (slide.kind === "none" && battle.kind === "none" && !row.marker) return null;

  return (
    <div className="sb-play sans">
      {slide.kind === "ready" && (
        <span className="sb-bind" data-on-screen={slide.active || undefined}>
          <OptimizedImage src={slide.slide.imageUrl} alt="" width={64} height={36} className="sb-thumb" />
          <span className="sb-bind-name">{slide.slide.title ?? t("slide")}</span>
          {slide.active ? (
            <span className="sb-bind-live">{t("onScreen")}</span>
          ) : (
            <button type="button" className="toggle" aria-label={t("showSlide")} disabled={play.pending} onClick={() => play.showSlide(row)}>
              <Play className="size-3" /> {t("show")}
            </button>
          )}
        </span>
      )}
      {row.marker && <MarkerPlay campaignId={campaignId} marker={row.marker} play={play} />}
      {slide.kind === "loading" && <span className="sb-bind sb-missing">{t("slideLoading")}</span>}
      {slide.kind === "missing" && <span className="sb-bind sb-missing">{t("slideMissing")}</span>}
      {battle.kind === "missing" && <span className="sb-bind sb-missing">{t("battleMissing")}</span>}
      {battle.kind === "ready" && (
        <span className="sb-bind" data-battle={battle.battle.status}>
          <Swords className="size-4 shrink-0" />
          <span className="sb-bind-name">
            {battle.battle.name} <small>· {tAll.has(`dashboard.battleStatus.${battle.battle.status}`) ? tAll(`dashboard.battleStatus.${battle.battle.status}`) : battle.battle.status}</small>
          </span>
          {action !== "none" && (
            <button type="button" className="toggle" disabled={play.pending} onClick={() => play.runBattle(row)}>
              {action === "start" ? t("startBattle") : battle.called ? t("callAgain") : t("callToBattle")}
            </button>
          )}
          {battle.battle.status === BattleStatus.ACTIVE && (
            <Link className="toggle" href={`/campaigns/${campaignId}/battles/${battle.battle.id}`} target="_blank" rel="noopener">
              {t("toBattle")}
            </Link>
          )}
          {action === "none" && battle.battle.status === BattleStatus.COMPLETED && (
            <button type="button" className="toggle" disabled>
              {t("battleDone")}
            </button>
          )}
        </span>
      )}
    </div>
  );
}
