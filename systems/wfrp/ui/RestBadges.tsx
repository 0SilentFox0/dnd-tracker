'use client';

import { useTranslations } from 'next-intl';

import { HudPill } from '@/components/hud/page';
import type { RestBadgesProps } from '@/components/systems/types';
import { SHEET_SLOT } from '@/systems/wfrp/rules/slots';

export function RestBadges({ sheet }: RestBadgesProps) {
    const t = useTranslations('rest.badges');

    const block = SHEET_SLOT.read(sheet.systemSlot);

    if (!block) return null;

    return (
        <>
            <HudPill tone="gold">
                {t('fortune', {
                    current: block.fortune,
                    max: block.fortuneMax,
                })}
            </HudPill>
            <HudPill tone="gold">
                {t('fate', { current: block.fateLeft ?? block.fate })}
            </HudPill>
        </>
    );
}
