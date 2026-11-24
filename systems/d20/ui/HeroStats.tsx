'use client';

import { useTranslations } from 'next-intl';
import {
    Crosshair,
    Dices,
    Eye,
    Footprints,
    Medal,
    Shield,
    Zap,
} from 'lucide-react';

import { useProfile } from '@/components/character-profile/ProfileContext';
import { HudStatTile } from '@/components/hud/page';
import { signed } from '@/lib/utils/common/format';

export function HeroStats() {
    const { sheet } = useProfile();

    const t = useTranslations('characterProfile.hero');

    const tc = useTranslations('gameTerms.stats');

    return (
        <div className="grid w-full grid-cols-3 gap-2 [&>:last-child:nth-child(3n+1)]:col-span-3">
            <HudStatTile
                icon={Shield}
                label="AC"
                short="AC"
                value={String(sheet.armorClass.total)}
            />
            <HudStatTile
                icon={Zap}
                label={tc('initiative')}
                short={t('short.initiative')}
                value={String(sheet.initiative)}
            />
            <HudStatTile
                icon={Footprints}
                label={tc('speed')}
                short={t('short.speed')}
                value={String(sheet.speed)}
            />
            <HudStatTile
                icon={Crosshair}
                label={t('toHit')}
                short={t('short.toHit')}
                value={sheet.bestToHit === null ? '—' : signed(sheet.bestToHit)}
            />
            <HudStatTile
                accent
                icon={Medal}
                label={t('proficiency')}
                short={t('short.proficiency')}
                value={signed(sheet.proficiency)}
            />
            {sheet.hitDice !== null && (
                <HudStatTile
                    icon={Dices}
                    label={t('hitDice')}
                    short={t('short.hitDice')}
                    value={sheet.hitDice}
                />
            )}
            <HudStatTile
                icon={Eye}
                label={t('passivePerception')}
                short={t('short.passive')}
                value={sheet.passives.perception}
            />
        </div>
    );
}
