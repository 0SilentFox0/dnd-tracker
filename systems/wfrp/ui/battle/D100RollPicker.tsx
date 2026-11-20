'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { D100Input } from './D100Input';
import type { FortuneChoice, FortuneExtras } from './fortune-controls';
import { FortunePicker } from './FortunePicker';

import { AiRollButton } from '@/components/battle/hud/DiceInput';
import { HudButton } from '@/components/hud';
import { cn } from '@/lib/utils';

export type RollSource = 'server' | 'manual';

export type { FortuneChoice };

const SOURCES: RollSource[] = ['server', 'manual'];

interface D100RollPickerProps {
    locked?: RollSource;
    fortune: FortuneExtras & {
        available: boolean;
        left: number;
        fateLeft?: number;
        value: FortuneChoice;
        onChange: (value: FortuneChoice) => void;
    };
    onRoll: (first: number, second?: number) => void;
    onAuto: () => void;
}

export function D100RollPicker({
    locked,
    fortune,
    onRoll,
    onAuto,
}: D100RollPickerProps) {
    const t = useTranslations('battleWizards.attack.roll.d100');

    const tf = useTranslations('battleWfrp.ui.fortune');

    const [chosen, setSource] = useState<RollSource>('server');

    const [first, setFirst] = useState<number>();

    const source = locked ?? chosen;

    const pickFortune = (value: FortuneChoice) => {
        setFirst(undefined);
        fortune.onChange(value);
    };

    const manualRoll = () => {
        if (fortune.value !== 'reroll') return <D100Input onRoll={onRoll} />;

        if (first === undefined)
            return (
                <>
                    <div className="mt-3 text-sm text-hud-gold">
                        {tf('firstRoll')}
                    </div>
                    <D100Input onRoll={setFirst} />
                </>
            );

        return (
            <>
                <div className="mt-3 text-sm text-hud-gold">
                    {tf('secondRoll')}
                </div>
                <D100Input
                    key="second"
                    onRoll={(second) => onRoll(first, second)}
                />
            </>
        );
    };

    return (
        <>
            {!locked && (
                <div className="mt-3 grid h-10 grid-cols-2 border border-white/20">
                    {SOURCES.map((m) => (
                        <HudButton
                            key={m}
                            type="button"
                            aria-pressed={source === m}
                            onClick={() => setSource(m)}
                            className={cn(
                                'border-l border-white/20 text-sm first:border-l-0',
                                source === m
                                    ? 'bg-white/10 font-bold text-[var(--ink)]'
                                    : 'text-hud-soft'
                            )}
                        >
                            {t(`mode.${m}`)}
                        </HudButton>
                    ))}
                </div>
            )}
            {fortune.available && (
                <FortunePicker
                    left={fortune.left}
                    fateLeft={fortune.fateLeft}
                    value={fortune.value}
                    onChange={pickFortune}
                    advantageLabel={fortune.advantageLabel}
                    rerolls={source === 'server' ? fortune.rerolls : undefined}
                    notFail={fortune.notFail}
                />
            )}
            {source === 'manual' ? (
                manualRoll()
            ) : (
                <div className="mt-3">
                    <AiRollButton onClick={onAuto} />
                </div>
            )}
        </>
    );
}
