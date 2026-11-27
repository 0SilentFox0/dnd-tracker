'use client';

import { useTranslations } from 'next-intl';

import { CombatRow } from '@/components/character-profile/combat/CombatRow';
import type { CombatRowProps } from '@/components/systems/types';
import { signed } from '@/lib/utils/common/format';

export function MoraleRow({ sheet, rules }: CombatRowProps) {
    const tg = useTranslations('gameTerms');

    const t = useTranslations('rulesMorale');

    if (!rules.morale.enabled) return null;

    return (
        <CombatRow
            label={tg('stats.moral')}
            hint={t('sheetHint')}
            value={signed(sheet.morale)}
        />
    );
}
