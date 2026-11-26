'use client';

import type { ReactNode } from 'react';

import { RulesBook } from './RulesBook';

import { ErrorState, LoadingState } from '@/components/common/states';
import { useRulesForm } from '@/lib/hooks/campaigns';
import type { CampaignRulesView } from '@/types/campaigns';

export function RulesForm({
    campaignId,
    title,
    readOnly = false,
    initial,
}: {
    campaignId: string;
    title: ReactNode;
    readOnly?: boolean;
    initial?: CampaignRulesView;
}) {
    const rules = useRulesForm(campaignId, { initial });

    if (rules.loadError)
        return <ErrorState error={rules.loadError} onRetry={rules.reload} />;

    if (rules.isLoading || !rules.form) return <LoadingState />;

    return (
        <RulesBook
            campaignId={campaignId}
            title={title}
            rules={rules}
            form={rules.form}
            readOnly={readOnly}
        />
    );
}
