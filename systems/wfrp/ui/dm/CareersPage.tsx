'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, Edit, Plus, Trash2 } from 'lucide-react';

import { DmCardGrid, DmListBody } from '@/components/common/entity/DmListBody';
import { EmptyState } from '@/components/common/states';
import { ContentCopyButton } from '@/components/content-copy/ContentCopyButton';
import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { useConfirm, useNotify } from '@/lib/hooks/common';
import { errorMessage } from '@/lib/utils/common/error-message';
import { useCareers, useDeleteCareer } from '@/systems/wfrp/hooks/careers';
import type { CareerData } from '@/systems/wfrp/rules/careers/types';
import { CareerEditPage } from '@/systems/wfrp/ui/careers/CareerEditPage';

export function CareersPage({
    campaignId,
    canEdit = true,
}: {
    campaignId: string;
    canEdit?: boolean;
}) {
    const t = useTranslations('wfrpCareers');

    const tc = useTranslations('common.actions');

    const list = useCareers(campaignId);

    const remove = useDeleteCareer(campaignId);

    const confirm = useConfirm();

    const notify = useNotify();

    const router = useRouter();

    const listHref = usePathname();

    const selected = useSearchParams().get('career');

    const careers = list.data ?? [];

    const open = (key: string) =>
        router.push(`${listHref}?career=${encodeURIComponent(key)}`);

    const editing = careers.find((c) => c.id === selected);

    if (canEdit && selected === 'new')
        return <CareerEditPage campaignId={campaignId} listHref={listHref} />;

    if (canEdit && editing)
        return (
            <CareerEditPage
                campaignId={campaignId}
                career={editing}
                listHref={listHref}
            />
        );

    const onDelete = async (career: CareerData) => {
        if (
            !(await confirm({
                title: t('page.deleteTitle', { name: career.name }),
                description: t('page.deleteBody'),
                confirmLabel: tc('delete'),
                destructive: true,
            }))
        )
            return;

        try {
            await remove.mutateAsync(career.id);
        } catch (e) {
            await notify(errorMessage(e, t('page.deleteFailed')));
        }
    };

    return (
        <HudPage width="list">
            <HudPageHeader
                title={t('page.title')}
                subtitle={t('page.subtitle', { count: careers.length })}
                actions={
                    canEdit && (
                        <>
                            <ContentCopyButton
                                campaignId={campaignId}
                                kind="careers"
                            />
                            <Button
                                onClick={() => open('new')}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                {t('page.create')}
                            </Button>
                        </>
                    )
                }
            />

            <DmListBody
                isLoading={list.isLoading}
                isEmpty={careers.length === 0}
                empty={
                    <EmptyState
                        icon={Briefcase}
                        title={t('page.emptyTitle')}
                        description={t('page.emptyDescription')}
                    />
                }
            >
                <DmCardGrid>
                    {careers.map((career) => (
                        <HudPanel
                            key={career.id}
                            className="flex flex-col gap-2"
                        >
                            <h3 className="hud-sc truncate text-lg text-hud-ink">
                                {career.name}
                            </h3>
                            <p className="text-xs text-hud-muted">
                                {career.tiers
                                    .map((tier) => tier.name)
                                    .join(' › ')}
                            </p>
                            {canEdit && (
                                <div className="mt-auto flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => open(career.id)}
                                    >
                                        <Edit className="mr-1 h-4 w-4" />
                                        {tc('edit')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="min-w-11"
                                        aria-label={tc('delete')}
                                        onClick={() => void onDelete(career)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </HudPanel>
                    ))}
                </DmCardGrid>
            </DmListBody>
        </HudPage>
    );
}
