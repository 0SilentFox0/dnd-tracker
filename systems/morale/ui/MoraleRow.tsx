'use client';

import { useTranslations } from 'next-intl';

import { CombatRow } from '@/components/character-profile/CombatRow';
import type { CombatRowProps } from '@/components/systems/types';
import { signed } from '@/lib/utils/common/format';

export function MoraleRow({ sheet, rules }: CombatRowProps) {
    const tg = useTranslations('gameTerms');

    if (!rules.morale.enabled) return null;

    return <CombatRow label={tg('stats.moral')} value={signed(sheet.morale)} />;
}
