'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

import { subscribeNothing } from './McpPanel';

import { HudPanel } from '@/components/hud/page';

export function RestApiPanel({ campaignId }: { campaignId: string }) {
    const t = useTranslations('ai');

    const origin = useSyncExternalStore(
        subscribeNothing,
        () => window.location.origin,
        () => ''
    );

    const curl = `curl -H "Authorization: Bearer <${t('page.curlTokenPlaceholder')}>" ${origin}/api/campaigns/${campaignId}/units`;

    return (
        <HudPanel>
            <h2 className="mb-3 font-semibold text-hud-ink">REST API</h2>
            <p className="mb-2 text-sm text-hud-muted">
                {t.rich('page.restBody', {
                    link: (chunks) => (
                        <a
                            href="/api/openapi.json"
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                        >
                            {chunks}
                        </a>
                    ),
                })}
            </p>
            <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-hud-ink">
                {curl}
            </pre>
        </HudPanel>
    );
}
