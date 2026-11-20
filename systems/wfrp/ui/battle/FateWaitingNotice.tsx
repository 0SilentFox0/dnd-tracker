'use client';

import { useTranslations } from 'next-intl';

import { WaitingNotice } from '@/components/hud';
import { useFateReaction } from '@/systems/wfrp/hooks/useFateReaction';

export function FateWaitingNotice() {
    const t = useTranslations('battleWfrp.ui.fateReaction');

    const { waiting } = useFateReaction();

    return waiting ? <WaitingNotice>{t('waiting')}</WaitingNotice> : null;
}
