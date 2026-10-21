"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";

import { OrderButtons } from "./OrderButtons";
import { PagePropertiesDialog } from "./PagePropertiesDialog";
import { RevealSettings } from "./RevealSettings";
import { RowBindings } from "./RowBindings";
import { SaveStatus } from "./SaveStatus";
import { type CellColumn, ScenarioCell } from "./ScenarioCell";
import { ScenarioToolbar } from "./ScenarioToolbar";
import { SectionHeaderEditor } from "./SectionHeaderEditor";

import { ScenarioLayout } from "@/components/scenario/ScenarioLayout";
import { ScenarioLegend } from "@/components/scenario/ScenarioLegend";
import { ScenarioToc, tocItems } from "@/components/scenario/ScenarioToc";
import { useConfirm, useCssVarHeight } from "@/lib/hooks/common";
import { useMentionSearch, useScenarioDraft, useScenarioPage } from "@/lib/hooks/scenario";
import { addRow, addSection, moveRow, moveSection, removeRow, removeSection, setRowBattle, setRowSlide, updateRow, updateSection } from "@/lib/utils/scenario/structure";
import type { RevealRule, RichDoc, ScenarioPage } from "@/types/scenario";

type ActiveCell = { rowId: string; column: CellColumn } | null;

type TocProps = { inline: boolean; drawer: { open: boolean; onOpenChange: (open: boolean) => void } };

export function ScenarioEditor({ campaignId, page, onExit, toolbarActions, onDraftReady, toc }: { campaignId: string; page: ScenarioPage; onExit: () => void; toolbarActions?: ReactNode; onDraftReady?: (draft: { flush: () => Promise<boolean> }) => void; toc: TocProps }) {
  const draft = useScenarioDraft(campaignId, page);

  useEffect(() => {
    onDraftReady?.({ flush: draft.flush });
  }, [onDraftReady, draft.flush]);

  const searchMentions = useMentionSearch(campaignId);

  const confirm = useConfirm();

  const { data: live = page } = useScenarioPage(campaignId, page.id);

  const [propsOpen, setPropsOpen] = useState(false);

  const [active, setActive] = useState<ActiveCell>(null);

  const [editor, setEditor] = useState<Editor | null>(null);

  const isHero = page.kind === "hero";

  const onReady = useCallback((e: Editor | null) => setEditor(e), []);

  const toolbarRef = useRef<HTMLDivElement>(null);

  useCssVarHeight(toolbarRef, "--sb-toolbar-h");

  const removeWithConfirm = async (title: string, apply: () => void) => {
    if (await confirm({ title: `Видалити ${title}?`, description: "Зміну можна відкотити через «Версії».", confirmLabel: "Видалити" })) apply();
  };

  const setReveal = (sectionId: string, rule: RevealRule) => draft.setContent((c) => updateSection(c, sectionId, { reveal: rule }));

  const finish = async () => {
    if ((await draft.flush()) || (await confirm({ title: "Є незбережені зміни. Вийти без збереження?", confirmLabel: "Вийти" }))) onExit();
  };

  const renderCell = (sectionId: string, rowId: string, column: CellColumn, doc: RichDoc) => (
    <ScenarioCell
      campaignId={campaignId}
      rowId={rowId}
      column={column}
      doc={doc}
      active={active?.rowId === rowId && active.column === column}
      searchMentions={searchMentions}
      handlers={{ onActivate: () => setActive({ rowId, column }), onReady, onChange: (next) => draft.setContent((c) => updateRow(c, sectionId, rowId, { [column]: next })) }}
    />
  );

  return (
    <>
      <div ref={toolbarRef} className="sb-toolbar-wrap">
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
      <ScenarioLayout toc={<ScenarioToc items={tocItems(draft.content.sections, isHero)} inline={toc.inline} drawer={toc.drawer} />}>
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
                onIcon: (icon) => draft.setContent((c) => updateSection(c, s.id, { icon })),
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
                <div className="story">{renderCell(s.id, r.id, "story", r.story)}</div>
                <aside className="notes" style={{ display: "block" }}>
                  {renderCell(s.id, r.id, "notes", r.notes)}
                  <div className="sb-row-foot sans">
                    <RowBindings
                      campaignId={campaignId}
                      pageId={page.id}
                      row={r}
                      onChange={{ slide: (v) => draft.setContent((c) => setRowSlide(c, s.id, r.id, v)), battle: (v) => draft.setContent((c) => setRowBattle(c, s.id, r.id, v)) }}
                    />
                    <div className="sb-row-order">
                      <OrderButtons
                        labels={{ up: "Рядок вгору", down: "Рядок вниз", remove: "Видалити рядок" }}
                        onMove={(dir) => draft.setContent((c) => moveRow(c, s.id, r.id, dir))}
                        onRemove={() => void removeWithConfirm("рядок", () => draft.setContent((c) => removeRow(c, s.id, r.id)))}
                      />
                    </div>
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
      </ScenarioLayout>
      {propsOpen && <PagePropertiesDialog campaignId={campaignId} page={live} legend={draft.content.legend} onLegend={(legend) => draft.setContent((c) => ({ ...c, legend }))} onClose={() => setPropsOpen(false)} />}
    </>
  );
}
