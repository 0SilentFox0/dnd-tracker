'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useToasts } from '@/lib/hooks/common';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    CAMPAIGN_NOTICE_PARAM,
    parseCampaignNotice,
} from '@/lib/utils/campaigns/notice';

export function useCampaignNotice() {
    const t = useTranslator('dashboard');

    const router = useRouter();

    const pathname = usePathname();

    const searchParams = useSearchParams();

    const { toasts, push, dismiss } = useToasts();

    const notice = parseCampaignNotice(searchParams.get(CAMPAIGN_NOTICE_PARAM));

    useEffect(() => {
        if (!notice) return;

        push({ id: `notice:${notice}`, text: t(`notices.${notice}`) });

        const next = new URLSearchParams(searchParams.toString());

        next.delete(CAMPAIGN_NOTICE_PARAM);

        const query = next.toString();

        router.replace(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
        });
    }, [notice, push, t, router, pathname, searchParams]);

    return { toasts, dismiss };
}
