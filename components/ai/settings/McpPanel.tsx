'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

import { HudPanel } from '@/components/hud/page';

const snippets = (origin: string, placeholder: string) => [
    {
        label: 'Claude Desktop',
        json: {
            mcpServers: {
                'dnd-tracker': {
                    command: 'npx',
                    args: [
                        '-y',
                        'mcp-remote',
                        `${origin}/api/mcp`,
                        '--header',
                        'Authorization: Bearer ${DNDT_TOKEN}',
                    ],
                    env: { DNDT_TOKEN: placeholder },
                },
            },
        },
    },
    {
        label: 'Cursor',
        json: {
            mcpServers: {
                'dnd-tracker': {
                    url: `${origin}/api/mcp`,
                    headers: { Authorization: `Bearer ${placeholder}` },
                },
            },
        },
    },
];

export const subscribeNothing = () => () => {};

export function McpPanel() {
    const t = useTranslations('ai');

    const origin = useSyncExternalStore(
        subscribeNothing,
        () => window.location.origin,
        () => ''
    );

    return (
        <HudPanel>
            <h2 className="mb-3 font-semibold text-hud-ink">
                {t('page.mcpHeading')}
            </h2>
            <div className="space-y-3">
                {snippets(origin, `<${t('page.tokenPlaceholder')}>`).map(
                    ({ label, json }) => (
                        <div key={label}>
                            <p className="mb-1 text-sm text-hud-muted">
                                {label}
                            </p>
                            <pre className="overflow-x-auto rounded-md bg-black/30 p-3 text-xs text-hud-ink">
                                {JSON.stringify(json, null, 2)}
                            </pre>
                        </div>
                    )
                )}
            </div>
        </HudPanel>
    );
}
