"use client";

import { type ReactNode, useCallback, useState } from "react";
import type { Editor } from "@tiptap/core";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { PagePropertiesDialog } from "./PagePropertiesDialog";
import { RevealSettings } from "./RevealSettings";
import { RichTextEditor } from "./RichTextEditor";
import { SaveStatus } from "./SaveStatus";
import { ScenarioToolbar } from "./ScenarioToolbar";
import { SectionHeaderEditor } from "./SectionHeaderEditor";

import { ScenarioLegend } from "@/components/scenario/ScenarioLegend";
import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import { useConfirm } from "@/lib/hooks/common";
import { useMentionSearch, useScenarioDraft, useScenarioPage } from "@/lib/hooks/scenario";
import { isDocEmpty } from "@/lib/utils/scenario/doc";
import { addRow, addSection, moveRow, moveSection, removeRow, removeSection, updateRow, updateSection } from "@/lib/utils/scenario/structure";
import type { RevealRule, RichDoc, ScenarioPage } from "@/types/scenario";

type Cell = { rowId: string; column: "story" | "notes" } | null;

export function ScenarioEditor({ campaignId, page, onExit, toolbarActions }: { campaignId: string; page: ScenarioPage; onExit: () => void; toolbarActions?: ReactNode }) {
  const draft = useScenarioDraft(campaignId, page);

  const searchMentions = useMentionSearch(campaignId);

  const confirm = useConfirm();

  const { data: live = page } = useScenarioPage(campaignId, page.id);

  const [propsOpen, setPropsOpen] = useState(false);

  const [active, setActive] = useState<Cell>(null);

  const [editor, setEditor] = useState<Editor | null>(null);

  const isHero = page.kind === "hero";

  const onReady = useCallback((e: Editor | null) => setEditor(e), []);

  const removeWithConfirm = async (title: string, apply: () => void) => {
    if (await confirm({ title: `Видалити ${title}?`, description: "Зміну можна відкотити через «Версії».", confirmLabel: "Видалити" })) apply();
  };

  const setReveal = (sectionId: string, rule: RevealRule) => draft.setContent((c) => updateSection(c, sectionId, { reveal: rule }));

  const finish = async () => {
    if ((await draft.flush()) || (await confirm({ title: "Є незбережені зміни. Вийти без збереження?", confirmLabel: "Вийти" }))) onExit();
  };

  const cell = (sectionId: string, rowId: string, column: "story" | "notes", doc: RichDoc) => {
    const isActive = active?.rowId === rowId && active.column === column;

    if (isActive) {
      return (
        <div className="sb-cell is-active">
          <RichTextEditor key={`${rowId}-${column}`} doc={doc} label={column === "story" ? "Сюжет" : "Нотатки майстра"} searchMentions={searchMentions} onReady={onReady} onChange={(next) => draft.setContent((c) => updateRow(c, sectionId, rowId, { [column]: next }))} />
        </div>
      );
    }

    return (
      <div className="sb-cell" role="button" tabIndex={0} onClick={() => setActive({ rowId, column })} onKeyDown={(e) => e.key === "Enter" && setActive({ rowId, column })}>
        {isDocEmpty(doc) ? <p className="sb-empty">{column === "story" ? "Сюжет — натисніть, щоб писати" : "Нотатки майстра"}</p> : <ScenarioRichText doc={doc} campaignId={campaignId} />}
      </div>
    );
  };

  return (
    <>
      <div className="sb-toolbar-wrap">
        <ScenarioToolbar editor={active ? editor : null} />
        <div className="sb-toolbar" style={{ borderTop: 0 }}>
          <SaveStatus state={draft.state} error={draft.error} onRetry={() => void draft.flush()} onReload={() => void draft.reload()} />
          <button type="button" className="toggle" onClick={() => setPropsOpen(true)}>
            Властивості
          </button>
          <button type="button" className="toggle" onClick={() => void finish()}>
            Готово
          </button>
          {toolbarActions}
        </div>
      </div>
      <header className="title">
        <h1>{live.title}</h1>
        {live.subtitle && <p>{live.subtitle}</p>}
        <ScenarioLegend legend={draft.content.legend} />
      </header>
      <main>
        {draft.content.sections.map((s) => (
          <section key={s.id} id={`sec-${s.id}`}>
            <SectionHeaderEditor
              section={s}
              actions={{
                onTitle: (title) => draft.setContent((c) => updateSection(c, s.id, { title })),
                onMove: (dir) => draft.setContent((c) => moveSection(c, s.id, dir)),
                onRemove: () => void removeWithConfirm(`розділ «${s.title}»`, () => draft.setContent((c) => removeSection(c, s.id))),
              }}
            />
            {isHero && (
              <RevealSettings
                key={JSON.stringify(s.reveal ?? null)}
                campaignId={campaignId}
                rule={s.reveal}
                revealed={!!s.revealedAt}
                onChange={(rule) => setReveal(s.id, rule)}
                onToggleRevealed={() => draft.setContent((c) => updateSection(c, s.id, { revealedAt: s.revealedAt ? null : new Date().toISOString() }))}
              />
            )}
            {s.rows.map((r) => (
              <div key={r.id} className="row">
                <div className="story">{cell(s.id, r.id, "story", r.story)}</div>
                <aside className="notes" style={{ display: "block" }}>
                  {cell(s.id, r.id, "notes", r.notes)}
                  <div className="sans" style={{ display: "flex", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
                    <button type="button" className="toggle" aria-label="Рядок вгору" onClick={() => draft.setContent((c) => moveRow(c, s.id, r.id, -1))}><ArrowUp className="size-4" /></button>
                    <button type="button" className="toggle" aria-label="Рядок вниз" onClick={() => draft.setContent((c) => moveRow(c, s.id, r.id, 1))}><ArrowDown className="size-4" /></button>
                    <button type="button" className="toggle" aria-label="Видалити рядок" onClick={() => void removeWithConfirm("рядок", () => draft.setContent((c) => removeRow(c, s.id, r.id)))}><Trash2 className="size-4" /></button>
                  </div>
                </aside>
              </div>
            ))}
            <button type="button" className="toggle sans" style={{ marginTop: 12 }} onClick={() => draft.setContent((c) => addRow(c, s.id))}>
              Додати рядок
            </button>
          </section>
        ))}
        <button type="button" className="toggle sans" style={{ marginTop: 40 }} onClick={() => draft.setContent((c) => addSection(c, isHero ? "Нова глава" : "Новий розділ"))}>
          Додати розділ
        </button>
      </main>
      {propsOpen && <PagePropertiesDialog campaignId={campaignId} page={live} legend={draft.content.legend} onLegend={(legend) => draft.setContent((c) => ({ ...c, legend }))} onClose={() => setPropsOpen(false)} />}
    </>
  );
}
