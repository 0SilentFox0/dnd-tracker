'use client';

import { RulesBook } from './RulesBook';

import { ErrorState, LoadingState } from '@/components/common/states';
import { useRulesForm } from '@/lib/hooks/campaigns';

export function RulesForm({
    campaignId,
    title,
}: {
    campaignId: string;
    title: string;
}) {
    const rules = useRulesForm(campaignId);

    if (rules.loadError)
        return <ErrorState error={rules.loadError} onRetry={rules.reload} />;

    if (rules.isLoading || !rules.form) return <LoadingState />;

    return (
        <RulesBook
            campaignId={campaignId}
            title={title}
            rules={rules}
            form={rules.form}
        />
    );
}
