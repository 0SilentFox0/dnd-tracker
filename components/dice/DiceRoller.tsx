'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dices, Minus, Plus } from 'lucide-react';

import '@/components/fx/fx.css';
import { DiceStage, type DiceStageHandle } from '@/components/dice/DiceStage';
import { HudButton } from '@/components/hud';
import {
    ROLLER_MAX_COUNT,
    ROLLER_SIDES,
    useDiceRoller,
} from '@/lib/hooks/common';
import { cn } from '@/lib/utils';
import type { DiceThrowSpec } from '@/lib/utils/battle/fx/dice';

const stepClass =
    'flex size-8 items-center justify-center rounded-full border border-hud-rule hover:bg-white/10 disabled:opacity-30';

export function DiceRoller() {
    const t = useTranslations('common.dice');

    const [open, setOpen] = useState(false);

    const stage = useRef<DiceStageHandle>(null);

    const play = useCallback(
        (spec: DiceThrowSpec) => stage.current?.play(spec) ?? Promise.resolve(),
        []
    );

    const { pick, result, isRolling, roll } = useDiceRoller(play);

    const { sides, count } = pick.data;

    return (
        <div
            className="relative"
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
            <HudButton
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={t('open')}
                className="flex size-9 items-center justify-center rounded-full border border-hud-rule bg-black/70 text-hud-bone hover:bg-black/90"
            >
                <Dices className="size-4" />
            </HudButton>
            {open && (
                <div
                    role="dialog"
                    aria-label={t('dialog')}
                    className="absolute top-11 right-0 w-64 space-y-3 rounded-lg border border-hud-rule bg-black/85 p-3 text-hud-bone shadow-2xl backdrop-blur"
                >
                    <div className="grid grid-cols-3 gap-1.5">
                        {ROLLER_SIDES.map((s) => (
                            <HudButton
                                key={s}
                                type="button"
                                aria-pressed={s === sides}
                                onClick={() => pick.set({ sides: s })}
                                className={cn(
                                    'h-9 rounded border border-hud-rule text-sm font-semibold hover:bg-white/10',
                                    s === sides &&
                                        'border-hud-crimson bg-hud-panel-2 text-hud-ink'
                                )}
                            >
                                d{s}
                            </HudButton>
                        ))}
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-hud-muted">
                            {t('count')}
                        </span>
                        <div className="flex items-center gap-2">
                            <HudButton
                                type="button"
                                aria-label={t('fewer')}
                                disabled={count <= 1}
                                onClick={() => pick.set({ count: count - 1 })}
                                className={stepClass}
                            >
                                <Minus className="size-3.5" />
                            </HudButton>
                            <span className="w-5 text-center font-semibold tabular-nums">
                                {count}
                            </span>
                            <HudButton
                                type="button"
                                aria-label={t('more')}
                                disabled={count >= ROLLER_MAX_COUNT}
                                onClick={() => pick.set({ count: count + 1 })}
                                className={stepClass}
                            >
                                <Plus className="size-3.5" />
                            </HudButton>
                        </div>
                    </div>
                    <HudButton
                        type="button"
                        disabled={isRolling}
                        onClick={() => void roll()}
                        className="h-10 w-full rounded border-2 border-hud-crimson bg-hud-panel-2 font-semibold text-hud-ink hover:bg-hud-panel-2 disabled:opacity-50"
                    >
                        {t('roll', { count, sides })}
                    </HudButton>
                    <div aria-live="polite" className="min-h-12 text-center">
                        {result && (
                            <>
                                <div className="text-3xl font-bold text-hud-ink tabular-nums">
                                    {result.total}
                                </div>
                                {result.values.length > 1 && (
                                    <div className="text-xs text-hud-muted">
                                        {result.values.length}d{result.sides}:{' '}
                                        {result.values.join(' + ')}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
            <DiceStage ref={stage} />
        </div>
    );
}
