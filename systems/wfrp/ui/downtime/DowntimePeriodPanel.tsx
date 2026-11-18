'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { PeriodSummaryView } from './PeriodSummaryView';

import { CharacterPickList } from '@/components/characters/rest/CharacterPickList';
import { UndoableResultDialog } from '@/components/common/UndoableResultDialog';
import type { DowntimePeriodPanelProps } from '@/components/systems/types';
import { Input } from '@/components/ui/input';
import { useCheckedIds } from '@/lib/hooks/common';
import { useDowntimePeriod, useDowntimePeriodUndo } from '@/systems/wfrp/hooks';
import { MAX_DAYS } from '@/systems/wfrp/rules/downtime/constants';

const DEFAULT_DAYS = 7;

export function DowntimePeriodPanel({
    campaignId,
    characters,
}: DowntimePeriodPanelProps) {
    const t = useTranslations('wfrpDowntime.panel');

    const period = useDowntimePeriod(campaignId);

    const undo = useDowntimePeriodUndo(campaignId);

    const [days, setDays] = useState(String(DEFAULT_DAYS));

    const [passed, setPassed] = useState(false);

    const result = passed ? (period.data ?? null) : null;

    const [undone, setUndone] = useState(false);

    const checked = useCheckedIds(characters);

    const maxDays = MAX_DAYS;

    const n = Number(days);

    const valid =
        days.trim() !== '' &&
        Number.isInteger(n) &&
        n >= 1 &&
        n <= maxDays &&
        checked.picked.size > 0;

    const reset = () => {
        setPassed(false);
        setUndone(false);
    };

    const submit = () =>
        void period
            .mutateOk({ days: n, characterIds: [...checked.picked] })
            .then((ok) => {
                if (ok) {
                    setPassed(true);
                    setUndone(false);
                }
            });

    const names = new Map(characters.map((c) => [c.id, c.name]));

    return (
        <UndoableResultDialog
            labels={{
                button: t('button'),
                title: t('title'),
                submit: t('submit'),
                result: t('result'),
                undo: t('undo'),
                undone: t('undone'),
                undoConfirm: t('undoConfirm'),
            }}
            result={
                result &&
                result.characters.map((c) => (
                    <div key={c.id}>
                        <p className="font-medium text-hud-ink">
                            {names.get(c.id) ?? c.id}
                        </p>
                        {c.downtime.lastPeriod && (
                            <PeriodSummaryView
                                summary={c.downtime.lastPeriod.summary}
                            />
                        )}
                    </div>
                ))
            }
            submit={{ onClick: submit, disabled: !valid || period.isPending }}
            undo={{
                pending: undo.isPending,
                done: undone,
                onConfirm: async () => {
                    if (!result) return;

                    const ok = await undo.mutateOk({
                        periodId: result.periodId,
                        characterIds: result.characters.map((c) => c.id),
                    });

                    if (ok) setUndone(true);
                },
            }}
            onClosed={reset}
        >
            <label className="block text-sm">
                {t('days')}
                <Input
                    className="mt-1 min-h-11"
                    type="number"
                    min={1}
                    max={maxDays}
                    inputMode="numeric"
                    aria-invalid={!valid && checked.picked.size > 0}
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                />
                <span className="text-xs text-hud-muted">
                    {t('daysHint', { max: maxDays })}
                </span>
            </label>
            <h3 className="hud-sc text-sm text-hud-gold">{t('heroes')}</h3>
            <CharacterPickList characters={characters} checked={checked} />
        </UndoableResultDialog>
    );
}
