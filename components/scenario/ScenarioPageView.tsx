"use client";

import { MarkerPlay, RowPlayControls } from "./play/RowPlayControls";
import { ScenarioLegend } from "./ScenarioLegend";
import { ScenarioRichText } from "./ScenarioRichText";
import { SectionIcon } from "./SectionIcon";

import type { ScenarioPlay, SectionCollapse } from "@/lib/hooks/scenario";
import { cn } from "@/lib/utils";
import { isDocEmpty } from "@/lib/utils/scenario/doc";
import { rowSlideState } from "@/lib/utils/scenario/play";
import { type PlayedLookup, sectionDone } from "@/lib/utils/scenario/reveal";
import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { ScenarioPage } from "@/types/scenario";

type Progress = { onPlayed: (sectionId: string, played: boolean) => void; onRevealed: (sectionId: string, revealed: boolean) => void; pending: boolean; played?: PlayedLookup };

export function ScenarioPageView({ page, campaignId, progress, play, collapse }: { page: ScenarioPage; campaignId: string; progress?: Progress; play?: ScenarioPlay; collapse?: SectionCollapse }) {
  const isHero = page.kind === "hero";

  return (
    <>
      <header className="title">
        <h1>{page.title}</h1>
        {page.subtitle && <p>{page.subtitle}</p>}
        <ScenarioLegend legend={page.content.legend} />
      </header>
      <main>
        {page.content.sections.map((s) => {
          const { done, byPlay } = sectionDone(s, isHero, progress?.played);

          const collapsed = !!collapse && done && !collapse.isExpanded(s.id);

          const icon = sectionIcon(s);

          const playedButton = progress && (
            <button type="button" className="toggle played" aria-pressed={done} disabled={progress.pending} onClick={() => (isHero ? progress.onRevealed(s.id, !s.revealedAt) : progress.onPlayed(s.id, !done))}>
              {isHero ? (byPlay ? "✓ Відкрито (після розділу)" : done ? "✓ Відкрито гравцеві" : "Відкрити гравцеві") : done ? "✓ Зіграно" : "Зіграно"}
            </button>
          );

          return (
            <section key={s.id} id={`sec-${s.id}`} className={cn(done && "is-played", collapsed && "is-collapsed")}>
              {collapsed && (
                <div className="sb-sec-collapsed">
                  <button type="button" className="sb-sec-expand" aria-expanded={false} onClick={() => collapse?.expand(s.id)}>
                    <span aria-hidden>✓</span>
                    <SectionIcon name={icon} className="sb-sec-icon" />
                    <span>{s.title}</span>
                    <span aria-hidden>▸</span>
                  </button>
                  {playedButton}
                </div>
              )}
              <div className="sb-sec-head">
                <div className="sb-sec-orn">
                  <SectionIcon name={icon} className="sb-sec-icon" />
                </div>
                <h2>{s.title}</h2>
                {!collapsed && playedButton}
                {play && s.marker && !collapsed && (
                  <div className="sb-play sans">
                    <MarkerPlay campaignId={campaignId} marker={s.marker} play={play} />
                  </div>
                )}
              </div>
              <div className="sb-rows" hidden={collapsed}>
                {s.rows.map((r) => {
                  const slideState = play ? rowSlideState(r, play.lookup) : null;

                  const clickable = slideState?.kind === "ready";

                  return (
                    <div
                      key={r.id}
                      id={`row-${r.id}`}
                      className={cn("row", clickable && "is-slide", slideState?.kind === "ready" && slideState.current && "is-current")}
                      title={clickable ? "Подвійний клік — показати слайд" : undefined}
                      onDoubleClick={
                        clickable
                          ? (e) => {
                              if ((e.target as HTMLElement).closest("a, button")) return;

                              window.getSelection()?.removeAllRanges();
                              play?.showSlide(r);
                            }
                          : undefined
                      }
                    >
                      <div className="story">
                        {play && <RowPlayControls campaignId={campaignId} row={r} play={play} />}
                        <ScenarioRichText doc={r.story} campaignId={campaignId} linkMentions />
                      </div>
                      <aside className="notes">{!isDocEmpty(r.notes) && <ScenarioRichText doc={r.notes} campaignId={campaignId} linkMentions />}</aside>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
