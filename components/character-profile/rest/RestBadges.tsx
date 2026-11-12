'use client';

import { useTranslations } from 'next-intl';

import { useProfile } from '../ProfileContext';

import { HudPill } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { useCampaignSystem } from '@/lib/hooks/systems';

export function RestBadges() {
    const t = useTranslations('rest.badges');

    const { campaignId, sheet } = useProfile();

    const rest = sheet.rest;

    const { def: system, system: current } = useCampaignSystem(
        campaignId,
        sheet.system
    );

    const Badges = systemUiOf(current.key, current.modules).RestBadges;

    if (!rest) return null;

    return (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            {rest.dead && <HudPill tone="silver">{t('dead')}</HudPill>}
            {Badges && <Badges sheet={sheet} />}
            {system.rest.kinds && rest.shortRestOpen && (
                <HudPill tone="gold">{t('shortRest')}</HudPill>
            )}
            {rest.xp && (
                <span className="text-hud-muted">
                    {t('xp', { value: rest.xp.value })}
                    {rest.xp.next !== null &&
                        t('xpNext', { next: rest.xp.next })}
                    {rest.xp.levelUp && (
                        <b className="ml-1 text-hud-gold">{t('levelUp')}</b>
                    )}
                </span>
            )}
        </div>
    );
}
