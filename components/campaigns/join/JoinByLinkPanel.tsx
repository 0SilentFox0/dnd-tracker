'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

import '@/components/systems/install';
import { Button } from '@/components/ui/button';
import { useJoinCampaign } from '@/lib/hooks/campaigns';
import { useTranslator } from '@/lib/i18n/use-translator';
import {
    isAlreadyMemberError,
    joinErrorMessage,
} from '@/lib/utils/campaigns/join-error';

interface JoinByLinkPanelProps {
    code: string;
    campaign: { id: string; name: string; dmName: string };
}

export function JoinByLinkPanel({ code, campaign }: JoinByLinkPanelProps) {
    const router = useRouter();

    const t = useTranslations('campaigns');

    const translate = useTranslator();

    const join = useJoinCampaign();

    const [error, setError] = useState<string | null>(null);

    const enter = () => {
        router.replace(`/campaigns/${campaign.id}`);
        router.refresh();
    };

    const handleJoin = () => {
        setError(null);
        join.mutate(code, {
            onSuccess: enter,
            onError: (err) =>
                isAlreadyMemberError(err)
                    ? enter()
                    : setError(joinErrorMessage(err, translate)),
        });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <p className="text-hud-muted text-sm">
                    {t('joinLink.description')}
                </p>
                <h2 className="hud-sc text-2xl text-hud-ink">
                    {campaign.name}
                </h2>
                {campaign.dmName && (
                    <p className="text-hud-muted text-sm">
                        {t('joinLink.dm', { name: campaign.dmName })}
                    </p>
                )}
            </div>

            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg bg-hud-field p-3 text-sm text-hud-danger shadow-[inset_0_0_0_1px_var(--color-hud-danger)]"
                >
                    <AlertCircle aria-hidden className="size-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <Button onClick={handleJoin} disabled={join.isPending || join.isSuccess}>
                {join.isPending ? t('joinLink.joining') : t('joinLink.submit')}
            </Button>
        </div>
    );
}
