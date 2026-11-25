'use client';

import { memo, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronUp } from 'lucide-react';

import { HeroStatesPanel } from './HeroStatesPanel';
import { RecommendedSpells } from './RecommendedSpells';
import { type SlotRing, SpellSlotRow } from './SpellSlotRow';

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
import {
    defaultSlotLevel,
    heroSlotViews,
    NO_EFFECTS,
    showDock,
    slotOrbit,
} from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

const PORTRAIT = 104;

const SLOT = 38;

const PHONE_PORTRAIT = 58;

const PHONE_SLOT = 36;

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

    const [pickedLevel, setLevel] = useState<number | null>(null);

    const { battle, effects, viewer, turn, roster } = useBattleSceneData();

    const { hpTerm } = useBattleRules();

    const { HeroStats, badges } = useSystemBattleUi();

    const slots = useMemo(
        () => (viewer.readOnly ? [] : heroSlotViews(hero)),
        [viewer.readOnly, hero]
    );

    const hpInDock =
        showDock(roster.hero, viewer.readOnly) &&
        battle.status === BattleStatus.ACTIVE;

    const level = pickedLevel ?? defaultSlotLevel(slots);

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

    const recommended = slots.length > 0 && (
        <RecommendedSpells hero={hero} level={level} canCast={turn.isMyTurn} />
    );

    const slotRow = (ring?: SlotRing) => (
        <SpellSlotRow
            slots={slots}
            selected={level}
            onSelect={setLevel}
            ring={ring}
        />
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
            size={phone ? PHONE_PORTRAIT : PORTRAIT}
            me
        />
    );

    const orbitOf = (size: number, slot: number): SlotRing & { box: number } => {
        const { radius, box } = slotOrbit(slots.length, size, slot);

        return { cx: box / 2, cy: box / 2, radius, size: slot, box };
    };

    const hpFallback = !hpInDock && (
        <span className="shrink-0 font-sans text-sm font-normal whitespace-nowrap">
            <HpFigure participant={hero} wounds={hpTerm === 'wounds'} />
        </span>
    );

    const orbited = (size: number, slot: number) => {
        const o = orbitOf(size, slot);

        return (
            <div
                className="relative shrink-0"
                style={{ width: o.box, height: o.box }}
            >
                {slotRow(o)}
                <div
                    className="absolute"
                    style={{ left: o.cx - size / 2, top: o.cy - size / 2 }}
                >
                    {portrait}
                </div>
            </div>
        );
    };

    if (phone) {
        const orbitOpen = open && slots.length > 0;

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
                                {hpFallback}
                            </div>
                            {statesPanel}
                            {recommended}
                        </div>
                    )}
                    {extras}
                    <TurnTimerBar />
                </div>
                <div
                    className={cn(
                        'flex items-center gap-1.5',
                        !orbitOpen && `${HUD_GLASS} rounded-2xl p-1.5`
                    )}
                >
                    {orbitOpen ? orbited(PHONE_PORTRAIT, PHONE_SLOT) : portrait}
                    {toggle}
                </div>
            </div>
        );
    }

    const ring = slots.length > 0;

    return (
        <div
            data-tour="battle.hero"
            className="pointer-events-auto flex items-end gap-2"
        >
            <div className="flex flex-col items-center gap-1">
                {ring ? orbited(PORTRAIT, SLOT) : portrait}
                <div
                    className={cn(
                        HUD_GLASS,
                        'w-[min(160px,100%)] rounded-xl px-2 py-1 empty:hidden [&>div]:mt-0'
                    )}
                >
                    <TurnTimerBar />
                </div>
            </div>
            <div className="flex w-[min(220px,40vw)] flex-col gap-2 pb-1">
                {recommended}
                <div
                    className={cn(
                        HUD_GLASS,
                        'flex flex-col gap-2 rounded-2xl p-3'
                    )}
                >
                    {statesPanel}
                    <div className="flex items-center gap-2">
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
                                {hpFallback}
                            </div>
                            {!hpInDock && (
                                <HealthBar
                                    participant={hero}
                                    exact
                                    className="h-1.5"
                                />
                            )}
                            {HeroStats && (
                                <div className="mt-1 text-sm text-hud-text">
                                    <HeroStats hero={hero} compact={false} />
                                </div>
                            )}
                        </div>
                        {toggle}
                    </div>
                    {extras}
                </div>
            </div>
        </div>
    );
});
