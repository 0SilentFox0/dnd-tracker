'use client';

import { useTranslations } from 'next-intl';

import { AiRollButton, DiceGrid } from '@/components/battle/hud/DiceInput';
import type { TurnStartPanelProps } from '@/components/systems/types';
import { useBattleScene } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { cryptoRandom, rollDie } from '@/lib/utils/common/dice';
import { useMoraleRoll } from '@/systems/morale/hooks/useMoraleRoll';
import { moraleTriggerRolls } from '@/systems/morale/rules/trigger-rolls';

export function MoralePanel({ hero, gate }: TurnStartPanelProps) {
    const tm = useTranslations('battleMorale');

    const { battle } = useBattleScene();

    const { roll } = useMoraleRoll(hero, gate);

    const morale = moraleTriggerRolls(hero, battle.initiativeOrder);

    return (
        <div className="pt-3">
            <div className="hud-sc text-lg font-bold">{tm('checkD10')}</div>
            {morale.kind && (
                <div
                    className={cn(
                        'mt-1 text-sm',
                        morale.kind === 'extra'
                            ? 'text-hud-gold-bright'
                            : 'text-hud-bad'
                    )}
                >
                    {tm(morale.kind === 'extra' ? 'extraOn' : 'skipOn', {
                        rolls: morale.rolls.join(', '),
                    })}
                </div>
            )}
            <DiceGrid
                sides={10}
                onPick={(v) => void roll(v)}
                highlight={
                    morale.kind
                        ? {
                              rolls: morale.rolls,
                              tone: morale.kind === 'extra' ? 'gold' : 'danger',
                          }
                        : undefined
                }
            />
            <div className="mt-2">
                <AiRollButton
                    onClick={() => void roll(rollDie(10, cryptoRandom))}
                />
            </div>
        </div>
    );
}
