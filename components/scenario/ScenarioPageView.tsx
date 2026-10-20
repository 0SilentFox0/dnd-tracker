"use client";

import { ScenarioLegend } from "./ScenarioLegend";
import { ScenarioRichText } from "./ScenarioRichText";

import { isDocEmpty } from "@/lib/utils/scenario/doc";
import { isChapterOpen, type PlayedLookup } from "@/lib/utils/scenario/reveal";
import type { ScenarioPage } from "@/types/scenario";

type Progress = { onPlayed: (sectionId: string, played: boolean) => void; onRevealed: (sectionId: string, revealed: boolean) => void; pending: boolean; played?: PlayedLookup };

export function ScenarioPageView({ page, campaignId, progress }: { page: ScenarioPage; campaignId: string; progress?: Progress }) {
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
          const byPlay = isHero && !s.revealedAt && !!progress?.played && isChapterOpen(s, progress.played);

          const done = isHero ? !!s.revealedAt || byPlay : s.played;

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
              {s.rows.map((r) => (
                <div key={r.id} className="row">
                  <div className="story">
                    <ScenarioRichText doc={r.story} campaignId={campaignId} linkMentions />
                  </div>
                  {isDocEmpty(r.notes) ? (
                    <aside className="notes" />
                  ) : (
                    <aside className="notes">
                      <ScenarioRichText doc={r.notes} campaignId={campaignId} linkMentions />
                    </aside>
                  )}
                </div>
              ))}
            </section>
          );
        })}
      </main>
    </>
  );
}
