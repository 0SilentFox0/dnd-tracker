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
    phone = false,
}: {
    hero: BattleParticipant;
    phone?: boolean;
}) {
    const t = useTranslations('battle.hero.states');

    const tHero = useTranslations('battle.hero');

    const [open, setOpen] = useState(false);

    const [level, setLevel] = useState<number | null>(null);

    const { battle, effects, viewer, turn } = useBattleSceneData();

    const { hpTerm } = useBattleRules();

    const { HeroStats, badges } = useSystemBattleUi();

    const slots = useMemo(
        () => (viewer.readOnly ? [] : heroSlotViews(hero)),
        [viewer.readOnly, hero]
    );

    const heroEffects = effects.get(hero.basicInfo.id) ?? NO_EFFECTS;

    const statesPanel = open && (
        <div id="hero-cluster-states">
            <HeroStatesPanel
                hero={hero}
                effects={heroEffects}
                round={battle.currentRound}
            />
        </div>
    );

    const slotsBlock = slots.length > 0 && (
        <div className={cn('flex flex-col gap-2', !open && 'max-md:hidden')}>
            <SpellSlotRow
                slots={slots}
                selected={level}
                onSelect={(l) => setLevel((cur) => (cur === l ? null : l))}
            />
            <RecommendedSpells
                hero={hero}
                level={level}
                canCast={turn.isMyTurn}
            />
        </div>
    );

    const extras = (
        <>
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
        </>
    );

    const toggle = (
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
    );

    const portrait = (
        <ZoomablePortrait
            participant={hero}
            fx="main"
            size={phone ? 52 : 62}
            me
        />
    );

    if (phone)
        return (
            <div
                data-tour="battle.hero"
                className="pointer-events-auto relative shrink-0"
            >
                <div
                    data-slot="hero-sheet"
                    className="absolute bottom-full left-0 mb-2 flex w-[min(300px,calc(100vw-16px))] flex-col gap-2 empty:hidden"
                >
                    {open && (
                        <div
                            className={cn(
                                HUD_GLASS,
                                'flex flex-col gap-2 rounded-2xl p-3'
                            )}
                        >
                            <div className="hud-sc flex items-baseline justify-between gap-2 text-[17px] font-bold text-[var(--ink)]">
                                <span className="truncate">
                                    {hero.basicInfo.name}
                                </span>
                                <span className="shrink-0 font-sans text-sm font-normal">
                                    <HpFigure
                                        participant={hero}
                                        wounds={hpTerm === 'wounds'}
                                    />
                                </span>
                            </div>
                            {statesPanel}
                            {slotsBlock}
                        </div>
                    )}
                    {extras}
                </div>
                <div
                    className={cn(
                        HUD_GLASS,
                        'flex items-center gap-1.5 rounded-2xl p-1.5'
                    )}
                >
                    {portrait}
                    {toggle}
                </div>
            </div>
        );

    return (
        <div
            data-tour="battle.hero"
            className={cn(
                HUD_GLASS,
                'pointer-events-auto flex w-[min(300px,70vw)] flex-col gap-2 rounded-2xl p-3'
            )}
        >
            {statesPanel}
            <div className="flex items-center gap-3">
                {portrait}
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
                {toggle}
            </div>
            {slotsBlock}
            {extras}
        </div>
    );
});
