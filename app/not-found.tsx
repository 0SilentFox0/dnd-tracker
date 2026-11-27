'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { BrokenD20 } from '@/components/common/illustrations';
import { EmptyState } from '@/components/common/states';
import { HudPage, HudPanel } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { useHydrated, useMarkNotFound } from '@/lib/hooks/common';
import { campaignIdFromPath } from '@/lib/utils/campaigns/notice';

export default function NotFound() {
    const t = useTranslations('common');

    const router = useRouter();

    const pathname = usePathname();

    const hydrated = useHydrated();

    // the 404 SSR has no real pathname, so pathname UI waits for hydration
    const campaignId = hydrated ? campaignIdFromPath(pathname) : null;

    const isCampaignPage =
        !!campaignId && pathname.split('/').filter(Boolean).length === 2;

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
        <HudPage width="narrow">
            <HudPanel>
                <EmptyState
                    illustration={<BrokenD20 />}
                    title={title}
                    description={t('notFound.description')}
                    action={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    window.history.length > 1
                                        ? router.back()
                                        : router.push('/campaigns')
                                }
                            >
                                {t('notFound.back')}
                            </Button>
                            {campaignId && !isCampaignPage && (
                                <Button asChild>
                                    <Link href={`/campaigns/${campaignId}`}>
                                        {t('notFound.campaign')}
                                    </Link>
                                </Button>
                            )}
                            <Button
                                asChild
                                variant={campaignId ? 'outline' : 'default'}
                            >
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
