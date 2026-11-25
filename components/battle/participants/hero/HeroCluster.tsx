'use client';

import { memo, useMemo, useState } from 'react';

import { RecommendedSpells } from './RecommendedSpells';
import { type SlotRing, SpellSlotRow } from './SpellSlotRow';

import { TurnTimerBar, ZoomablePortrait } from '@/components/battle/hud';
import { HUD_GLASS } from '@/components/hud';
import { useBattleSceneData, useBattleSpellLibrary } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import {
    defaultSlotLevel,
    heroSlotViews,
    slotArcHeight,
    slotArcRadius,
} from '@/lib/utils/battle/view';
import type { BattleParticipant } from '@/types/battle';

const SIZES = {
    desktop: { portrait: 104, slot: 30 },
    phone: { portrait: 58, slot: 28 },
};

export const HeroCluster = memo(function HeroCluster({
    hero,
    phone = false,
}: {
    hero: BattleParticipant;
    phone?: boolean;
}) {
    const { portrait: size, slot } = SIZES[phone ? 'phone' : 'desktop'];

    const [pickedLevel, setLevel] = useState<number | null>(null);

    const { viewer } = useBattleSceneData();

    const spells = useBattleSpellLibrary(hero, {
        isOpen: !phone && !viewer.readOnly,
        free: false,
    });

    const slots = useMemo(
        () =>
            phone || viewer.readOnly || !spells.length
                ? []
                : heroSlotViews(hero),
        [phone, viewer.readOnly, spells.length, hero]
    );

    const level = pickedLevel ?? defaultSlotLevel(slots);

    const arcRadius = slotArcRadius(size, slot);

    const ring: SlotRing = {
        cx: size / 2,
        cy: size / 2,
        radius: arcRadius,
        size: slot,
        arc: true,
    };

    const recommended = !phone && !viewer.readOnly && spells.length > 0 && (
        <RecommendedSpells
            spells={spells}
            level={level}
            compact={phone}
            actionLeft={!hero.actionFlags.hasUsedAction}
        />
    );

    return (
        <div
            data-tour="battle.hero"
            className="pointer-events-auto relative flex flex-col items-start gap-1"
        >
            <div className="flex items-end gap-2">
                <div className="flex flex-col items-start gap-1">
                    <div
                        className="relative shrink-0"
                        style={{
                            width: phone
                                ? size
                                : size / 2 + arcRadius + slot / 2,
                            height: slotArcHeight(slots.length, size, slot),
                        }}
                    >
                        <SpellSlotRow
                            slots={slots}
                            selected={level}
                            onSelect={setLevel}
                            ring={ring}
                        />
                        <div className="absolute top-0 left-0">
                            <ZoomablePortrait
                                participant={hero}
                                fx="main"
                                size={size}
                                me
                            />
                        </div>
                    </div>
                    <div
                        className={cn(
                            HUD_GLASS,
                            'rounded-xl px-2 py-1 empty:hidden [&>div]:mt-0'
                        )}
                        style={{ width: size }}
                    >
                        <TurnTimerBar />
                    </div>
                </div>
                {recommended && (
                    <div className="mb-1 w-fit max-w-[min(300px,34vw)]">
                        {recommended}
                    </div>
                )}
            </div>
        </div>
    );
});
