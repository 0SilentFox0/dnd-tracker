'use client';

import { useTranslations } from 'next-intl';

import { WaitingNotice } from '@/components/hud';
import { useCounterWindow } from '@/lib/hooks/battle';

export function CounterWindowBanner() {
    const t = useTranslations('battle.counterWindow');

    const { window, offers, secondsLeft } = useCounterWindow();

    if (!window || offers.length > 0) return null;

    return (
        <WaitingNotice>
            {t(window.dmDeciding ? 'bannerDm' : 'banner', {
                seconds: secondsLeft,
            })}
        </WaitingNotice>
    );
}
