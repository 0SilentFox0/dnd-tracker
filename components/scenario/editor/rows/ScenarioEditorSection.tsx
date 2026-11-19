'use client';

import { useTranslations } from 'next-intl';

import { OrderButtons } from '../chrome/OrderButtons';
import { SectionHeaderEditor } from '../chrome/SectionHeaderEditor';
import { RevealSettings } from './RevealSettings';
import { RowBindings } from './RowBindings';
import type { CellColumn } from './ScenarioCell';

import { HudButton } from '@/components/hud';
import {
    addRow,
    moveRow,
    moveSection,
    removeRow,
    removeSection,
    setRowBattle,
    setRowMarker,
    setRowSlide,
    setSectionMarker,
    setSectionTrack,
    updateSection,
} from '@/lib/utils/scenario/structure';
import type {
    RevealRule,
    RichDoc,
    ScenarioContent,
    ScenarioSection,
} from '@/types/scenario';

export interface SectionEditOps {
    setContent: (fn: (c: ScenarioContent) => ScenarioContent) => void;
    confirmRemove: (title: string, apply: () => void) => Promise<void>;
    renderCell: (
        sectionId: string,
        rowId: string,
        column: CellColumn,
        doc: RichDoc
    ) => React.ReactNode;
    setReveal: (sectionId: string, rule: RevealRule) => void;
}

export function ScenarioEditorSection({
    campaignId,
    pageId,
    section: s,
    isHero,
    ops,
}: {
    campaignId: string;
    pageId: string;
    section: ScenarioSection;
    isHero: boolean;
    ops: SectionEditOps;
}) {
    const t = useTranslations('scenario.editor');

    const { setContent, confirmRemove, renderCell, setReveal } = ops;

    return (
        <section id={`sec-${s.id}`}>
            <SectionHeaderEditor
                campaignId={campaignId}
                section={s}
                actions={{
                    onTitle: (title) =>
                        setContent((c) => updateSection(c, s.id, { title })),
                    onIcon: (icon) =>
                        setContent((c) => updateSection(c, s.id, { icon })),
                    onMarker: (marker) =>
                        setContent((c) => setSectionMarker(c, s.id, marker)),
                    onTrack: (trackId) =>
                        setContent((c) => setSectionTrack(c, s.id, trackId)),
                    onMove: (dir) =>
                        setContent((c) => moveSection(c, s.id, dir)),
                    onRemove: () =>
                        void confirmRemove(
                            t('removeSection', {
                                title: s.title,
                            }),
                            () => setContent((c) => removeSection(c, s.id))
                        ),
                }}
            />
            {isHero && (
                <RevealSettings
                    key={JSON.stringify(s.reveal ?? null)}
                    campaignId={campaignId}
                    rule={s.reveal}
                    revealed={!!s.revealedAt}
                    onChange={(rule) => setReveal(s.id, rule)}
                    onToggleRevealed={() =>
                        setContent((c) =>
                            updateSection(c, s.id, {
                                revealedAt: s.revealedAt
                                    ? null
                                    : new Date().toISOString(),
                            })
                        )
                    }
                />
            )}
            {s.rows.map((r) => (
                <div key={r.id} className="row">
                    <div className="story">
                        {renderCell(s.id, r.id, 'story', r.story)}
                    </div>
                    <aside className="notes" style={{ display: 'block' }}>
                        {renderCell(s.id, r.id, 'notes', r.notes)}
                        <div className="sb-row-foot sans">
                            <RowBindings
                                campaignId={campaignId}
                                pageId={pageId}
                                row={r}
                                onChange={{
                                    slide: (v) =>
                                        setContent((c) =>
                                            setRowSlide(c, s.id, r.id, v)
                                        ),
                                    battle: (v) =>
                                        setContent((c) =>
                                            setRowBattle(c, s.id, r.id, v)
                                        ),
                                    marker: (v) =>
                                        setContent((c) =>
                                            setRowMarker(c, s.id, r.id, v)
                                        ),
                                }}
                            />
                            <div className="sb-row-order">
                                <OrderButtons
                                    labels={{
                                        up: t('rowUp'),
                                        down: t('rowDown'),
                                        remove: t('rowRemove'),
                                    }}
                                    onMove={(dir) =>
                                        setContent((c) =>
                                            moveRow(c, s.id, r.id, dir)
                                        )
                                    }
                                    onRemove={() =>
                                        void confirmRemove(t('removeRow'), () =>
                                            setContent((c) =>
                                                removeRow(c, s.id, r.id)
                                            )
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </aside>
                </div>
            ))}
            <HudButton
                type="button"
                className="toggle sans"
                style={{ marginTop: 12 }}
                onClick={() => setContent((c) => addRow(c, s.id))}
            >
                {t('addRow')}
            </HudButton>
        </section>
    );
}
