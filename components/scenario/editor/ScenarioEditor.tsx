'use client';

import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useTranslations } from 'next-intl';
import type { Editor } from '@tiptap/core';

import {
    type AcquaintanceDialogTarget,
    acquaintanceTargetFor,
    acquaintanceToolEnabled,
} from './acquaintance/acquaintance-target';
import { AcquaintanceDialog } from './acquaintance/AcquaintanceDialog';
import { SaveStatus } from './chrome/SaveStatus';
import { ScenarioToolbar } from './chrome/ScenarioToolbar';
import { PagePropertiesDialog } from './dialogs/PagePropertiesDialog';
import { type CellColumn, ScenarioCell } from './rows/ScenarioCell';
import { ScenarioEditorSection } from './rows/ScenarioEditorSection';

import { HudButton } from '@/components/hud';
import { ScenarioLayout } from '@/components/scenario/book/ScenarioLayout';
import { ScenarioLegend } from '@/components/scenario/book/ScenarioLegend';
import {
    ScenarioToc,
    type TocControl,
    tocItems,
} from '@/components/scenario/book/ScenarioToc';
import { useConfirm, useCssVarHeight } from '@/lib/hooks/common';
import {
    useMentionSearch,
    useScenarioDraft,
    useScenarioPage,
} from '@/lib/hooks/scenario';
import {
    addSection,
    updateRow,
    updateSection,
} from '@/lib/utils/scenario/structure';
import type { RevealRule, RichDoc, ScenarioPage } from '@/types/scenario';

type ActiveCell = {
    rowId: string;
    sectionId: string;
    column: CellColumn;
} | null;

type AcquaintanceSession = {
    target: AcquaintanceDialogTarget;
    range: { from: number; to: number };
};

export function ScenarioEditor({
    campaignId,
    page,
    onExit,
    toolbarActions,
    onDraftReady,
    toc,
}: {
    campaignId: string;
    page: ScenarioPage;
    onExit: () => void;
    toolbarActions?: ReactNode;
    onDraftReady?: (draft: {
        flush: () => Promise<boolean>;
        hasUnsavedChanges?: () => boolean;
    }) => void;
    toc: TocControl;
}) {
    const t = useTranslations('scenario.editor');

    const tActions = useTranslations('common.actions');

    const draft = useScenarioDraft(campaignId, page);

    useEffect(() => {
        onDraftReady?.({
            flush: draft.flush,
            hasUnsavedChanges: draft.hasUnsavedChanges,
        });
    }, [onDraftReady, draft.flush, draft.hasUnsavedChanges]);

    const searchMentions = useMentionSearch(campaignId);

    const confirm = useConfirm();

    const { data: live = page } = useScenarioPage(campaignId, page.id);

    const [propsOpen, setPropsOpen] = useState(false);

    const [active, setActive] = useState<ActiveCell>(null);

    const [editor, setEditor] = useState<Editor | null>(null);

    const [acquaintance, setAcquaintance] =
        useState<AcquaintanceSession | null>(null);

    const isHero = page.kind === 'hero';

    const onReady = useCallback((e: Editor | null) => setEditor(e), []);

    const toolbarRef = useRef<HTMLDivElement>(null);

    useCssVarHeight(toolbarRef, '--sb-toolbar-h');

    const removeWithConfirm = async (title: string, apply: () => void) => {
        if (
            await confirm({
                title,
                description: t('removeHint'),
                confirmLabel: tActions('delete'),
            })
        )
            apply();
    };

    const setReveal = (sectionId: string, rule: RevealRule) =>
        draft.setContent((c) => updateSection(c, sectionId, { reveal: rule }));

    const finish = async () => {
        if (
            (await draft.flush()) ||
            (await confirm({
                title: t('unsavedExit'),
                confirmLabel: t('exit'),
            }))
        )
            onExit();
    };

    const openAcquaintance = async () => {
        if (!editor || !active) return;

        const session = acquaintanceTargetFor(editor, {
            pageId: page.id,
            sectionId: active.sectionId,
        });

        // the server checks the section exists in the saved page, so a just-added section must be saved first
        if (draft.hasUnsavedChanges() && !(await draft.flush())) return;

        setAcquaintance(session);
    };

    const insertAcquaintance = ({
        id,
        label,
    }: {
        id: string;
        label: string;
    }) => {
        if (!editor || !acquaintance) return;

        editor
            .chain()
            .focus()
            .insertContentAt(acquaintance.range, {
                type: 'mention',
                attrs: { id, label, type: 'acquaintance' },
            })
            .run();
    };

    const renderCell = (
        sectionId: string,
        rowId: string,
        column: CellColumn,
        doc: RichDoc
    ) => (
        <ScenarioCell
            campaignId={campaignId}
            rowId={rowId}
            column={column}
            doc={doc}
            active={active?.rowId === rowId && active.column === column}
            searchMentions={searchMentions}
            handlers={{
                onActivate: () => setActive({ rowId, sectionId, column }),
                onReady,
                onChange: (next) =>
                    draft.setContent((c) =>
                        updateRow(c, sectionId, rowId, { [column]: next })
                    ),
            }}
        />
    );

    const sectionOps = {
        setContent: draft.setContent,
        confirmRemove: removeWithConfirm,
        renderCell,
        setReveal,
    };

    return (
        <>
            <div ref={toolbarRef} className="sb-toolbar-wrap">
                <ScenarioToolbar
                    editor={active ? editor : null}
                    onAcquaintance={
                        acquaintanceToolEnabled(page.kind)
                            ? () => void openAcquaintance()
                            : undefined
                    }
                />
                <div className="sb-toolbar" style={{ borderTop: 0 }}>
                    <SaveStatus
                        state={draft.state}
                        error={draft.error}
                        onRetry={() => void draft.flush()}
                        onReload={() => void draft.reload()}
                        onRetain={draft.retainLocal}
                    />
                    <HudButton
                        type="button"
                        className="toggle"
                        onClick={() => setPropsOpen(true)}
                    >
                        {t('properties')}
                    </HudButton>
                    <HudButton
                        type="button"
                        className="toggle"
                        onClick={() => void finish()}
                    >
                        {t('done')}
                    </HudButton>
                    {toolbarActions}
                </div>
            </div>
            <ScenarioLayout
                toc={
                    <ScenarioToc
                        items={tocItems(draft.content.sections, isHero)}
                        {...toc}
                    />
                }
            >
                <header className="title">
                    <h1>{live.title}</h1>
                    {live.subtitle && <p>{live.subtitle}</p>}
                    <ScenarioLegend legend={draft.content.legend} />
                </header>
                <main>
                    {draft.content.sections.map((s) => (
                        <ScenarioEditorSection
                            key={s.id}
                            campaignId={campaignId}
                            pageId={page.id}
                            section={s}
                            isHero={isHero}
                            ops={sectionOps}
                        />
                    ))}
                    <HudButton
                        type="button"
                        className="toggle sans"
                        style={{ marginTop: 40 }}
                        onClick={() =>
                            draft.setContent((c) =>
                                addSection(
                                    c,
                                    isHero ? t('newChapter') : t('newSection')
                                )
                            )
                        }
                    >
                        {t('addSection')}
                    </HudButton>
                </main>
            </ScenarioLayout>
            {acquaintance && (
                <AcquaintanceDialog
                    campaignId={campaignId}
                    target={acquaintance.target}
                    sections={draft.content.sections.map(({ id, title }) => ({
                        id,
                        title,
                    }))}
                    onInsert={insertAcquaintance}
                    onClose={() => setAcquaintance(null)}
                />
            )}
            {propsOpen && (
                <PagePropertiesDialog
                    campaignId={campaignId}
                    page={live}
                    legend={draft.content.legend}
                    onLegend={(legend) =>
                        draft.setContent((c) => ({ ...c, legend }))
                    }
                    onClose={() => setPropsOpen(false)}
                />
            )}
        </>
    );
}
