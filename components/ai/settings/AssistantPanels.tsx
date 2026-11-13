'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AiInstructionsEditor } from '@/components/ai';
import { QueryState } from '@/components/common/states';
import { HudPanel } from '@/components/hud/page';
import { useAiSettings } from '@/lib/hooks/ai';

export function AssistantPanels({ campaignId }: { campaignId: string }) {
    const t = useTranslations('ai');

    const settings = useAiSettings(campaignId);

    return (
        <>
            <HudPanel>
                <h2 className="mb-3 font-semibold text-hud-ink">
                    {t('page.instructionsHeading')}
                </h2>
                <QueryState query={settings.query}>
                    {() => (
                        <AiInstructionsEditor
                            value={settings.instructions}
                            onSave={settings.save}
                            pending={settings.isPending}
                        />
                    )}
                </QueryState>
            </HudPanel>
            <HudPanel>
                <h2 className="mb-1 font-semibold text-hud-ink">
                    {t('page.keysHeading')}
                </h2>
                <p className="text-sm text-hud-muted">
                    {t.rich('page.keysBody', {
                        link: (chunks) => (
                            <Link href="/settings/ai" className="underline">
                                {chunks}
                            </Link>
                        ),
                    })}
                </p>
            </HudPanel>
        </>
    );
}
