'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { BrokenD20 } from '@/components/common/illustrations';
import { EmptyState } from '@/components/common/states';
import { HudPage, HudPanel } from '@/components/hud/page';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    const t = useTranslations('common.notFound');

    const router = useRouter();

    return (
        <HudPage width="narrow">
            <HudPanel>
                <EmptyState
                    illustration={<BrokenD20 />}
                    title={t('title')}
                    description={t('description')}
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
                                {t('back')}
                            </Button>
                            <Button asChild>
                                <Link href="/campaigns">{t('campaigns')}</Link>
                            </Button>
                        </div>
                    }
                />
            </HudPanel>
        </HudPage>
    );
}
