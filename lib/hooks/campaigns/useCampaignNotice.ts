'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { useToasts } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    CAMPAIGN_NOTICE_PARAM,
    parseCampaignNotice,
} from '@/lib/utils/campaigns/notice';

export function useCampaignNotice() {
    const t = useTranslator('dashboard');

    const searchParams = useSearchParams();

    const { toasts, push, dismiss } = useToasts();

    const notice = parseCampaignNotice(searchParams.get(CAMPAIGN_NOTICE_PARAM));

    useEffect(() => {
        if (!notice) return;

        push({ id: `notice:${notice}`, text: t(`notices.${notice}`) });

        const next = new URLSearchParams(window.location.search);

        next.delete(CAMPAIGN_NOTICE_PARAM);

        const query = next.toString();

        window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
        );
    }, [notice, push, t]);

    return { toasts, dismiss };
}
