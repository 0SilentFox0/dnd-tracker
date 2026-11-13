'use client';

import { useTranslations } from 'next-intl';

import type { TurnGateOutcome } from '@/lib/utils/battle/flows';

export function MoraleLabel({ outcome }: { outcome?: TurnGateOutcome }) {
    const tm = useTranslations('battle.morale');

    const tc = useTranslations('battle.turnControls');

    return <>{outcome ? tm(`outcome.${outcome}`) : tc('strip.gate')}</>;
}
