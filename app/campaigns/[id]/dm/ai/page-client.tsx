'use client';

import { useTranslations } from 'next-intl';

import { AssistantPanels } from '@/components/ai/settings/AssistantPanels';
import { McpPanel } from '@/components/ai/settings/McpPanel';
import { RestApiPanel } from '@/components/ai/settings/RestApiPanel';
import { TokensPanel } from '@/components/ai/settings/TokensPanel';
import { HudPage, HudPageHeader } from '@/components/hud/page';
import { API_TOKEN_SCOPES, CONTENT_SCOPES } from '@/lib/constants/ai';

export function DmAiPageClient({
    campaignId,
    isTemplate,
}: {
    campaignId: string;
    isTemplate: boolean;
}) {
    const t = useTranslations('ai');

    return (
        <HudPage>
            <HudPageHeader
                title={isTemplate ? t('page.titleTemplate') : t('page.title')}
                subtitle={
                    isTemplate ? t('page.subtitleTemplate') : t('page.subtitle')
                }
            />
            <div className="space-y-4">
                {!isTemplate && <AssistantPanels campaignId={campaignId} />}
                <TokensPanel
                    campaignId={campaignId}
                    scopes={isTemplate ? CONTENT_SCOPES : API_TOKEN_SCOPES}
                />
                <RestApiPanel campaignId={campaignId} />
                <McpPanel />
            </div>
        </HudPage>
    );
}
