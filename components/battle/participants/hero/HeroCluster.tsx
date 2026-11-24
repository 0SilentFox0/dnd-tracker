'use client';

import { memo, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronUp } from 'lucide-react';

import { HeroStatesPanel } from './HeroStatesPanel';
import { RecommendedSpells } from './RecommendedSpells';
import { SpellSlotRow } from './SpellSlotRow';

import {
    HealthBar,
    HpFigure,
    TurnTimerBar,
    ZoomablePortrait,
} from '@/components/battle/hud';
import { ReactionSpellButton } from '@/components/battle/turn/ReactionSpellButton';
import { ReadiedAttackButton } from '@/components/battle/turn/ReadiedAttackButton';
import { useSystemBattleUi } from '@/components/battle/use-system-battle-ui';
import { HUD_GLASS, HudButton } from '@/components/hud';
import { BattleStatus } from '@/lib/constants/battle';
import { useBattleRules, useBattleSceneData } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { heroSlotViews, NO_EFFECTS } from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

export const HeroCluster = memo(function HeroCluster({
    hero,
}: {
    hero: BattleParticipant;
}) {
    const t = useTranslations('battle.hero.states');

    const tHero = useTranslations('battle.hero');

    const [open, setOpen] = useState(false);

    const [level, setLevel] = useState<number | null>(null);

    const { battle, effects, viewer } = useBattleSceneData();

    const { hpTerm } = useBattleRules();

    const { HeroStats, badges } = useSystemBattleUi();

    const slots = useMemo(
        () => (viewer.readOnly ? [] : heroSlotViews(hero)),
        [viewer.readOnly, hero]
    );

    const heroEffects = effects.get(hero.basicInfo.id) ?? NO_EFFECTS;

    return (
        <div
            data-tour="battle.hero"
            className={cn(
                HUD_GLASS,
                'pointer-events-auto flex w-[min(300px,70vw)] flex-col gap-2 rounded-2xl p-3'
            )}
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
                <ZoomablePortrait participant={hero} fx="main" size={62} me />
                <div className="min-w-0 flex-1">
                    <div className="hud-sc flex items-baseline justify-between gap-2 text-[17px] font-bold text-[var(--ink)]">
                        <span className="flex min-w-0 items-baseline gap-2">
                            <span className="truncate">
                                {hero.basicInfo.name}
                            </span>
                            {badges?.map((Badge, i) => (
                                <Badge
                                    key={i}
                                    participant={hero}
                                    place="hero"
                                />
                            ))}
                        </span>
                        <span className="shrink-0 font-sans text-sm font-normal whitespace-nowrap">
                            <HpFigure
                                participant={hero}
                                wounds={hpTerm === 'wounds'}
                            />
                        </span>
                    </div>
                    <HealthBar participant={hero} exact className="h-1.5" />
                    {HeroStats && (
                        <div className="mt-1 text-sm text-hud-text">
                            <HeroStats hero={hero} compact={false} />
                        </div>
                    )}
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
                        className={cn(
                            'size-5 transition-transform',
                            open && 'rotate-180'
                        )}
                    />
                </HudButton>
            </div>
            {slots.length > 0 && (
                <div
                    className={cn(
                        'flex flex-col gap-2',
                        !open && 'max-md:hidden'
                    )}
                >
                    <SpellSlotRow
                        slots={slots}
                        selected={level}
                        onSelect={(l) =>
                            setLevel((cur) => (cur === l ? null : l))
                        }
                    />
                    <RecommendedSpells hero={hero} level={level} />
                </div>
            )}
            {hero.battleData.pendingCast && (
                <p className="text-sm">
                    {tHero('pendingCast', {
                        spell: hero.battleData.pendingCast.spellName,
                        rounds: hero.battleData.pendingCast.remainingRounds,
                    })}
                </p>
            )}
            <ReadiedAttackButton participant={hero} />
            {battle.status === BattleStatus.ACTIVE && (
                <ReactionSpellButton participant={hero} />
            )}
            <TurnTimerBar />
        </div>
    );
});
