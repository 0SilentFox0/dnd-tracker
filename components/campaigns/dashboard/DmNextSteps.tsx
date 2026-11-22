'use client';

import Link from 'next/link';
import { Database } from 'lucide-react';

import { HudPanel } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { DM_DASHBOARD_SECTIONS } from '@/lib/constants/campaign-dashboard';
import { useTranslator } from '@/lib/i18n/use-translator';

export function DmNextSteps({
    campaignId,
    sectionKeys,
}: {
    campaignId: string;
    sectionKeys: string[];
}) {
    const t = useTranslator('dashboard');

    const sections = sectionKeys.flatMap((key) =>
        DM_DASHBOARD_SECTIONS.filter((section) => section.key === key)
    );

    return (
        <HudPanel className="flex flex-col" data-tour="dashboard.dm-next-steps">
            <h2 className="hud-sc mb-3 text-[13px] tracking-[.06em] text-hud-gold">
                {t('nextSteps.title')}
            </h2>
            <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-2">
                {sections.map(({ key, href, icon: Icon }) => (
                    <Button
                        asChild
                        key={key}
                        variant="outline"
                        className="h-full min-h-11 justify-start"
                    >
                        <Link href={href(campaignId)}>
                            <Icon aria-hidden className="size-4 shrink-0" />
                            <span className="truncate">
                                {t(`sections.${key}.title`)}
                            </span>
                        </Link>
                    </Button>
                ))}
                <Button
                    asChild
                    variant="outline"
                    className="h-full min-h-11 justify-start"
                >
                    <Link
                        href={`/campaigns/${campaignId}/dm/compendium`}
                        aria-label={t('page.compendium.link')}
                    >
                        <Database aria-hidden className="size-4 shrink-0" />
                        <span className="truncate">
                            {t('page.compendium.action')}
                        </span>
                    </Link>
                </Button>
            </div>
        </HudPanel>
    );
}
