"use client";

import { RowPlayControls } from "./play/RowPlayControls";
import { ScenarioLegend } from "./ScenarioLegend";
import { ScenarioRichText } from "./ScenarioRichText";

import type { ScenarioPlay } from "@/lib/hooks/scenario";
import { cn } from "@/lib/utils";
import { isDocEmpty } from "@/lib/utils/scenario/doc";
import { rowSlideState } from "@/lib/utils/scenario/play";
import { type PlayedLookup, sectionDone } from "@/lib/utils/scenario/reveal";
import type { ScenarioPage } from "@/types/scenario";

type Progress = { onPlayed: (sectionId: string, played: boolean) => void; onRevealed: (sectionId: string, revealed: boolean) => void; pending: boolean; played?: PlayedLookup };

export function ScenarioPageView({ page, campaignId, progress, play }: { page: ScenarioPage; campaignId: string; progress?: Progress; play?: ScenarioPlay }) {
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

          return (
            <section key={s.id} id={`sec-${s.id}`} className={done ? "is-played" : undefined}>
              <h2>
                {s.title}
                {progress && (
                  <button type="button" className="toggle played" aria-pressed={done} disabled={progress.pending} onClick={() => (isHero ? progress.onRevealed(s.id, !s.revealedAt) : progress.onPlayed(s.id, !done))}>
                    {isHero ? (byPlay ? "✓ Відкрито (після розділу)" : done ? "✓ Відкрито гравцеві" : "Відкрити гравцеві") : done ? "✓ Зіграно" : "Зіграно"}
                  </button>
                )}
              </h2>
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
            </section>
          );
        })}
      </main>
    </>
  );
}
