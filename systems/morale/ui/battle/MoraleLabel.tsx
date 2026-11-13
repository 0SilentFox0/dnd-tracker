'use client';

import { useTranslations } from 'next-intl';

import type { TurnGateOutcome } from '@/lib/utils/battle/flows';

export function MoraleLabel({ outcome }: { outcome?: TurnGateOutcome }) {
    const t = useTranslations('battleMorale');

    return <>{outcome ? t(`outcome.${outcome}`) : t('strip')}</>;
}
