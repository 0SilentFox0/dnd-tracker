'use client';

import { useTranslations } from 'next-intl';

import { RollResultView } from '@/components/character-profile/RollResultView';
import type { RollDialogBodyProps } from '@/components/systems/types';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/ui/select-field';
import {
    DIFFICULTY_KEYS,
    type DifficultyKey,
} from '@/systems/wfrp/rules/percentile/difficulty';

export function RollDialogBody({
    result,
    difficulty,
    setDifficulty,
}: RollDialogBodyProps) {
    const t = useTranslations('rest.sheetRoll');

    const tg = useTranslations('gameTerms');

    return (
        <>
            <div className="space-y-1">
                <Label htmlFor="sheet-roll-difficulty">{t('difficulty')}</Label>
                <SelectField
                    id="sheet-roll-difficulty"
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v)}
                    options={DIFFICULTY_KEYS.map((key) => ({
                        value: key,
                        label: tg(`difficulty.${key}`),
                    }))}
                    triggerClassName="w-full"
                />
            </div>
            {result?.kind === 'percentile' && (
                <RollResultView
                    total={result.roll}
                    detail={
                        <>
                            {t('target', { target: result.target })}
                            {result.reversed && (
                                <span title={t('reversed')}> ↔</span>
                            )}
                            {result.auto && (
                                <span> · {t(`auto.${result.auto}`)}</span>
                            )}
                        </>
                    }
                >
                    <div className="mt-1 text-sm">
                        {tg(`testOutcome.${result.outcome}`)} ·{' '}
                        {t('sl', { sl: result.sl })}
                    </div>
                    <div className="text-xs text-hud-muted">
                        {tg(`difficulty.${result.difficulty as DifficultyKey}`)}
                    </div>
                </RollResultView>
            )}
        </>
    );
}
