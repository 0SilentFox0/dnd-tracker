'use client';

import { useTranslations } from 'next-intl';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudStatChip } from '@/components/hud/page';
import { signed } from '@/lib/utils/common/format';

export function HeroStats() {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.hero');

    const tc = useTranslations('gameTerms.stats');

    return (
        <>
            <HudStatChip
                size="lg"
                label="AC"
                short="AC"
                value={String(sheet.armorClass.total)}
            />
            <HudStatChip
                size="lg"
                label={tc('initiative')}
                short={t('short.initiative')}
                value={String(sheet.initiative)}
            />
            <HudStatChip
                size="lg"
                label={tc('speed')}
                short={t('short.speed')}
                value={String(sheet.speed)}
            />
            <HudStatChip
                size="lg"
                label={t('toHit')}
                short={t('short.toHit')}
                value={sheet.bestToHit === null ? '—' : signed(sheet.bestToHit)}
            />
            <HudStatChip
                size="lg"
                label={t('proficiency')}
                short={t('short.proficiency')}
                value={signed(sheet.proficiency)}
            />
        </>
    );
}
