'use client';

import { Shield } from 'lucide-react';

import type { HeroStatsProps } from '@/components/systems/types';
import { useBattleSceneData } from '@/lib/hooks/battle';
import { getEffectiveArmorClass } from '@/lib/utils/battle/participant/helpers';

export function HeroStats({ hero, compact }: HeroStatsProps) {
    const { battle } = useBattleSceneData();

    const armorClass = getEffectiveArmorClass(hero, battle.initiativeOrder);

    if (compact) return <>{` · AC ${armorClass}`}</>;

    return (
        <span className="flex items-center gap-1.5">
            <Shield className="size-4 text-hud-soft" />
            {armorClass}
        </span>
    );
}
