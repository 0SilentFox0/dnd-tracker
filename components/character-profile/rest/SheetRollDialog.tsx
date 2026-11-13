'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useProfile } from '../ProfileContext';

import '@/components/battle/fx/fx.css';
import {
    DiceStage,
    type DiceStageHandle,
} from '@/components/dice/DiceStage';
import { FormAlert } from '@/components/common/states';
import { type SheetRollRequest, systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SwitchField } from '@/components/ui/switch-field';
import { useSheetRoll } from '@/lib/hooks/characters';
import { cryptoRandom } from '@/lib/utils/common/dice';
import type { SheetRollBody, SheetRollResult } from '@/types/characters';

export type { SheetRollRequest };

function rollBody(
    subject: SheetRollBody,
    difficulty: string,
    useInspiration: boolean
): SheetRollBody {
    if (subject.kind === 'test') return { ...subject, difficulty };

    return { ...subject, ...(useInspiration && { useInspiration: true }) };
}

export function SheetRollDialog({
    request,
    onClose,
}: {
    request: SheetRollRequest | null;
    onClose: () => void;
}) {
    const t = useTranslations('rest');

    const { campaignId, characterId, sheet } = useProfile();

    const roll = useSheetRoll(campaignId, characterId);

    const Ui = systemUiOf(sheet.system);

    const stage = useRef<DiceStageHandle>(null);

    const [useInspiration, setUseInspiration] = useState(false);

    const [difficulty, setDifficulty] = useState('challenging');

    const [result, setResult] = useState<SheetRollResult | null>(null);

    const [error, setError] = useState<string | null>(null);

    const close = () => {
        setResult(null);
        setError(null);
        setUseInspiration(false);
        setDifficulty('challenging');
        onClose();
    };

    const throwDice = async () => {
        if (!request) return;

        setError(null);

        try {
            const r = await roll.mutateAsync(
                rollBody(request.subject, difficulty, useInspiration)
            );

            setResult(r);
            setUseInspiration(false);

            if (r.kind === 'd20')
                void stage.current?.play({
                    seed: Math.floor(cryptoRandom() * 2 ** 31),
                    groups: [
                        r.rolls.map((value) => ({ sides: 20 as const, value })),
                    ],
                });
        } catch (e) {
            setError(e instanceof Error ? e.message : t('errors.rollFailed'));
        }
    };

    return (
        <ResponsiveDialog
            hud
            open={!!request}
            onOpenChange={(o) => !o && close()}
            title={request?.label ?? ''}
            footer={
                <Button
                    type="button"
                    disabled={roll.isPending}
                    onClick={() => void throwDice()}
                >
                    {t('sheetRoll.roll')}
                </Button>
            }
        >
            {sheet.rest?.inspiration &&
                !result &&
                request?.subject.kind !== 'test' && (
                    <SwitchField
                        id="sheet-roll-inspiration"
                        ariaLabel={t('sheetRoll.inspirationAria')}
                        label={t('sheetRoll.inspiration')}
                        checked={useInspiration}
                        onCheckedChange={setUseInspiration}
                    />
                )}
            {request && (
                <Ui.RollDialogBody
                    request={request}
                    result={result}
                    difficulty={difficulty}
                    setDifficulty={setDifficulty}
                />
            )}
            {error && <FormAlert>{error}</FormAlert>}
            <DiceStage ref={stage} />
        </ResponsiveDialog>
    );
}
