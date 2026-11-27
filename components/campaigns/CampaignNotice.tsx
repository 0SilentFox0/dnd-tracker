'use client';

import { ToastHost } from '@/components/common/shell/ToastHost';
import { useCampaignNotice } from '@/lib/hooks/campaigns';

export function CampaignNotice() {
    const { toasts, dismiss } = useCampaignNotice();

    return <ToastHost toasts={toasts} onDismiss={dismiss} />;
}
