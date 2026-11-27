'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { EmptyState } from '@/components/common/states';
import { HudPage, HudPanel } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { useMarkNotFound } from '@/lib/hooks/common';
import { campaignIdFromPath } from '@/lib/utils/campaigns/notice';

export default function NotFound() {
    const t = useTranslations('common');

    const campaignId = campaignIdFromPath(usePathname());

    const title = t('notFound.title');

    useMarkNotFound();

    useEffect(() => {
        const previous = document.title;

        document.title = title;

        return () => {
            document.title = previous;
        };
    }, [title]);

    return (
        <HudPage width="md">
            <HudPanel>
                <EmptyState
                    title={title}
                    action={
                        <div className="flex flex-wrap justify-center gap-2">
                            {campaignId && (
                                <Button asChild>
                                    <Link href={`/campaigns/${campaignId}`}>
                                        {t('notFound.campaign')}
                                    </Link>
                                </Button>
                            )}
                            <Button asChild variant={campaignId ? 'outline' : 'default'}>
                                <Link href="/campaigns">
                                    {campaignId
                                        ? t('notFound.campaigns')
                                        : t('notFound.home')}
                                </Link>
                            </Button>
                        </div>
                    }
                />
            </HudPanel>
        </HudPage>
    );
}
