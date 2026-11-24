'use client';

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronUp } from 'lucide-react';

import { HeroStatesPanel } from './HeroStatesPanel';

import {
    HealthBar,
    HpFigure,
    TurnTimerBar,
    ZoomablePortrait,
} from '@/components/battle/hud';
import { HudButton } from '@/components/hud';
import { useBattleRules, useBattleSceneData } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { NO_EFFECTS } from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

export const HeroCluster = memo(function HeroCluster({
    hero,
}: {
    hero: BattleParticipant;
}) {
    const t = useTranslations('battle.hero.states');

    const [open, setOpen] = useState(false);

    const { battle, effects } = useBattleSceneData();

    const { hpTerm } = useBattleRules();

    const heroEffects = effects.get(hero.basicInfo.id) ?? NO_EFFECTS;

    return (
        <div
            data-tour="battle.hero"
            className="pointer-events-auto flex w-[min(300px,70vw)] flex-col gap-2 rounded-2xl border border-white/20 bg-black/70 p-3"
        >
            {open && (
                <div id="hero-cluster-states">
                    <HeroStatesPanel
                        hero={hero}
                        effects={heroEffects}
                        round={battle.currentRound}
                    />
                </div>
            )}
            <div className="flex items-center gap-3">
                <ZoomablePortrait participant={hero} fx="main" size={56} me />
                <div className="min-w-0 flex-1">
                    <div className="hud-sc flex items-baseline justify-between gap-2 text-[17px] font-bold text-[var(--ink)]">
                        <span className="truncate">{hero.basicInfo.name}</span>
                        <span className="shrink-0 font-sans text-sm font-normal whitespace-nowrap">
                            <HpFigure
                                participant={hero}
                                wounds={hpTerm === 'wounds'}
                            />
                        </span>
                    </div>
                    <HealthBar participant={hero} exact className="h-1.5" />
                </div>
                <HudButton
                    type="button"
                    aria-expanded={open}
                    aria-controls="hero-cluster-states"
                    aria-label={open ? t('collapse') : t('expand')}
                    onClick={() => setOpen((v) => !v)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:outline-none"
                >
                    <ChevronUp
                        aria-hidden
                        className={cn('size-5 transition-transform', open && 'rotate-180')}
                    />
                </HudButton>
            </div>
            <TurnTimerBar />
        </div>
    );
});
