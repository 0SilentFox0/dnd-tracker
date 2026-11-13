'use client';

import { useTranslations } from 'next-intl';

import type { BattleBadgeProps } from '@/components/systems/types';
import { useBattleSceneData } from '@/lib/hooks/battle';
import { cn } from '@/lib/utils';
import { effectiveMorale } from '@/lib/utils/battle/morale/effective-morale';
import { signed } from '@/lib/utils/common/format';
import type { BattleParticipant } from '@/types/battle';

export function MoraleBadge({ participant, place }: BattleBadgeProps) {
    return place === 'hero' ? (
        <HeroMoraleBadge participant={participant} />
    ) : null;
}

function HeroMoraleBadge({ participant }: { participant: BattleParticipant }) {
    const t = useTranslations('battleMorale');

    const { battle } = useBattleSceneData();

    const morale = effectiveMorale(participant, battle.initiativeOrder).value;

    if (morale === 0) return null;

    return (
        <span
            className={cn(
                'shrink-0 font-sans text-sm font-medium tracking-normal',
                morale > 0 ? 'text-hud-good' : 'text-hud-danger'
            )}
        >
            {t('badge', { value: signed(morale) })}
        </span>
    );
}
