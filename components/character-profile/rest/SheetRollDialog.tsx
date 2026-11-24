'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useProfile } from '../ProfileContext';

import '@/components/fx/fx.css';
import { FormAlert } from '@/components/common/states';
import { DiceStage, type DiceStageHandle } from '@/components/dice/DiceStage';
import { type SheetRollRequest, systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useSheetRoll } from '@/lib/hooks/characters';
import { prefersReducedMotion } from '@/lib/hooks/common';
import { useCampaignSystem } from '@/lib/hooks/systems';
import { cryptoRandom } from '@/lib/utils/common/dice';
import type {
    SheetRollBody,
    SheetRollExtra,
    SheetRollResult,
} from '@/types/characters';

export type { SheetRollRequest };

const DICE_WAIT_MS = 1200;

function rollBody(
    subject: SheetRollBody,
    difficulty: string,
    useInspiration: boolean,
    extra: SheetRollExtra
): SheetRollBody {
    if (subject.kind === 'test') return { ...subject, difficulty, ...extra };

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

    const { system } = useCampaignSystem(campaignId, sheet.system);

    const Ui = systemUiOf(system.key, system.modules);

    const stage = useRef<DiceStageHandle>(null);

    const [useInspiration, setUseInspiration] = useState(false);

    const [difficulty, setDifficulty] = useState('challenging');

    const [extra, setExtra] = useState<SheetRollExtra>({});

    const [result, setResult] = useState<SheetRollResult | null>(null);

    const [error, setError] = useState<string | null>(null);

    const [rolling, setRolling] = useState(false);

    const run = useRef(0);

    const close = () => {
        run.current++;
        setRolling(false);
        setResult(null);
        setError(null);
        setUseInspiration(false);
        setDifficulty('challenging');
        setExtra({});
        onClose();
    };

    const throwDice = async () => {
        if (!request) return;

        setError(null);

        try {
            const r = await roll.mutateAsync(
                rollBody(request.subject, difficulty, useInspiration, extra)
            );

            setUseInspiration(false);
            setExtra({});

            if (r.kind === 'check' && !prefersReducedMotion()) {
                const mine = ++run.current;

                setRolling(true);
                await Promise.race([
                    stage.current?.play({
                        seed: Math.floor(cryptoRandom() * 2 ** 31),
                        groups: [
                            r.rolls.map((value) => ({
                                sides: 20 as const,
                                value,
                            })),
                        ],
                    }),
                    new Promise((resolve) => setTimeout(resolve, DICE_WAIT_MS)),
                ]);

                if (mine !== run.current) return;

                setRolling(false);
            }

            setResult(r);
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
                    disabled={roll.isPending || rolling}
                    onClick={() => void throwDice()}
                >
                    {t('sheetRoll.roll')}
                </Button>
            }
        >
            {Ui.rerollToken &&
                sheet.rest?.inspiration &&
                !result &&
                request?.subject.kind !== 'test' && (
                    <Ui.rerollToken.SheetOption
                        checked={useInspiration}
                        onChange={setUseInspiration}
                    />
                )}
            {request && (
                <Ui.RollDialogBody
                    request={request}
                    result={result}
                    difficulty={difficulty}
                    setDifficulty={setDifficulty}
                    extra={extra}
                    setExtra={setExtra}
                />
            )}
            {error && <FormAlert>{error}</FormAlert>}
            <DiceStage ref={stage} />
        </ResponsiveDialog>
    );
}
