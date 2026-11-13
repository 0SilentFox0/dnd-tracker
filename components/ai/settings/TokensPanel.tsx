'use client';

import { useTranslations } from 'next-intl';

import { ApiTokenList } from '@/components/ai';
import { QueryState } from '@/components/common/states';
import { HudPanel } from '@/components/hud/page';
import type { ApiTokenScope } from '@/lib/constants/ai';
import { useApiTokens } from '@/lib/hooks/ai';

export function TokensPanel({
    campaignId,
    scopes,
}: {
    campaignId: string;
    scopes: readonly ApiTokenScope[];
}) {
    const t = useTranslations('ai');

    const tokens = useApiTokens(campaignId);

    return (
        <HudPanel>
            <h2 className="mb-3 font-semibold text-hud-ink">
                {t('page.tokensHeading')}
            </h2>
            <QueryState query={tokens.query}>
                {(list) => (
                    <ApiTokenList
                        campaignId={campaignId}
                        tokens={list}
                        scopes={scopes}
                        actions={{
                            onCreate: tokens.create,
                            onRevoke: (id) => void tokens.revoke(id),
                        }}
                    />
                )}
            </QueryState>
        </HudPanel>
    );
}
