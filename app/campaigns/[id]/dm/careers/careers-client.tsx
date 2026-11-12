'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Briefcase, Edit, Plus, Trash2 } from 'lucide-react';

import { DmCardGrid, DmListBody } from '@/components/common/DmListBody';
import { EmptyState } from '@/components/common/states';
import { HudPage, HudPageHeader, HudPanel } from '@/components/hud/page';
import { systemUiOf } from '@/components/systems';
import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useCareers, useDeleteCareer } from '@/lib/hooks/careers';
import { useConfirm, useNotify } from '@/lib/hooks/common';
import { errorMessage } from '@/lib/utils/common/error-message';
import type { CareerData } from '@/types/careers';

const FORM_ID = 'career-form';

export function DMCareersPageClient({
    campaignId,
    systemKey,
    canEdit = true,
}: {
    campaignId: string;
    systemKey: string;
    canEdit?: boolean;
}) {
    const CareerForm = systemUiOf(systemKey).CareerForm;

    const t = useTranslations('wfrpCareers');

    const tc = useTranslations('common.actions');

    const list = useCareers(campaignId);

    const remove = useDeleteCareer(campaignId);

    const confirm = useConfirm();

    const notify = useNotify();

    const [editing, setEditing] = useState<CareerData | 'new' | null>(null);

    const [saving, setSaving] = useState(false);

    const careers = list.data ?? [];

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
        <HudPage>
            <HudPageHeader
                title={t('page.title')}
                subtitle={t('page.subtitle', { count: careers.length })}
                actions={
                    canEdit && (
                        <Button
                            onClick={() => setEditing('new')}
                            className="flex min-h-11 items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            {t('page.create')}
                        </Button>
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
                                        className="min-h-11 flex-1"
                                        onClick={() => setEditing(career)}
                                    >
                                        <Edit className="mr-1 h-4 w-4" />
                                        {tc('edit')}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="min-h-11 min-w-11"
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

            <ResponsiveDialog
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
                title={
                    editing === 'new'
                        ? t('form.createTitle')
                        : t('form.editTitle')
                }
                size="lg"
                hud
                dismissible={!saving}
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            onClick={() => setEditing(null)}
                        >
                            {tc('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            form={FORM_ID}
                            className="min-h-11"
                            disabled={saving}
                        >
                            {tc('save')}
                        </Button>
                    </>
                }
            >
                {editing && CareerForm && (
                    <CareerForm
                        key={editing === 'new' ? 'new' : editing.id}
                        formId={FORM_ID}
                        campaignId={campaignId}
                        career={editing === 'new' ? undefined : editing}
                        onSavingChange={setSaving}
                        onDone={() => setEditing(null)}
                    />
                )}
            </ResponsiveDialog>
        </HudPage>
    );
}
