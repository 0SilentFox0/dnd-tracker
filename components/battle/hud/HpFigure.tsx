'use client';

import { useTranslations } from 'next-intl';

import type { BattleParticipant } from '@/types/battle';

export function HpFigure({
    participant,
    wounds,
}: {
    participant: BattleParticipant;
    wounds: boolean;
}) {
    const t = useTranslations('battle.hud');

    const { currentHp, maxHp } = participant.combatStats;

    return (
        <>
            {wounds && `${t('wounds')} `}
            {currentHp} / {maxHp}
        </>
    );
}
