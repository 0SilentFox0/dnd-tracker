'use client';

import { useTranslations } from 'next-intl';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudStatChip } from '@/components/hud/page';
import { signed } from '@/lib/utils/common/format';

const TILE = 'min-w-16 basis-16 rounded-xl py-2';

const GOLD_TILE = `${TILE} border-hud-gold`;

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
                className={TILE}
            />
            <HudStatChip
                size="lg"
                label={tc('initiative')}
                short={t('short.initiative')}
                value={String(sheet.initiative)}
                className={TILE}
            />
            <HudStatChip
                size="lg"
                label={tc('speed')}
                short={t('short.speed')}
                value={String(sheet.speed)}
                className={TILE}
            />
            <HudStatChip
                size="lg"
                label={t('toHit')}
                short={t('short.toHit')}
                value={sheet.bestToHit === null ? '—' : signed(sheet.bestToHit)}
                className={TILE}
            />
            <HudStatChip
                size="lg"
                label={t('proficiency')}
                short={t('short.proficiency')}
                value={signed(sheet.proficiency)}
                className={GOLD_TILE}
            />
            {sheet.hitDice !== null && (
                <HudStatChip
                    size="lg"
                    label={t('hitDice')}
                    short={t('short.hitDice')}
                    value={sheet.hitDice}
                    className={TILE}
                />
            )}
            <HudStatChip
                size="lg"
                label={t('passivePerception')}
                short={t('short.passive')}
                value={sheet.passives.perception}
                className={TILE}
            />
        </>
    );
}
