'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { CareerForm } from './CareerForm';

import { HudFormMenu } from '@/components/hud';
import { HudFormPage } from '@/components/hud/form';
import { Button } from '@/components/ui/button';
import { useNotify } from '@/lib/hooks/common';
import { errorMessage } from '@/lib/utils/common/error-message';
import { useDeleteCareer } from '@/systems/wfrp/hooks/careers';
import type { CareerData } from '@/systems/wfrp/rules/careers/types';

const FORM_ID = 'career-form';

export function CareerEditPage({
    campaignId,
    career,
    listHref,
}: {
    campaignId: string;
    career?: CareerData;
    listHref: string;
}) {
    const t = useTranslations('wfrpCareers');

    const tc = useTranslations('common');

    const router = useRouter();

    const notify = useNotify();

    const remove = useDeleteCareer(campaignId);

    const [saving, setSaving] = useState(false);

    const onDelete = async () => {
        if (!career) return;

        try {
            await remove.mutateAsync(career.id);
            router.push(listHref);
        } catch (e) {
            await notify(errorMessage(e, t('page.deleteFailed')));
        }
    };

    return (
        <HudFormPage
            width="wide"
            header={{
                title: career ? t('form.editTitle') : t('form.createTitle'),
                aside: career?.name,
                back: { href: listHref, label: tc('dmSections.careers') },
                menu: career ? (
                    <HudFormMenu
                        items={[
                            {
                                label: tc('actions.delete'),
                                tone: 'danger',
                                disabled: saving,
                                confirm: {
                                    title: t('page.deleteTitle', {
                                        name: career.name,
                                    }),
                                    description: t('page.deleteBody'),
                                    confirmLabel: tc('actions.delete'),
                                    destructive: true,
                                },
                                onSelect: () => void onDelete(),
                            },
                        ]}
                    />
                ) : undefined,
            }}
            actions={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(listHref)}
                    >
                        {tc('actions.cancel')}
                    </Button>
                    <Button type="submit" form={FORM_ID} disabled={saving}>
                        {tc('actions.save')}
                    </Button>
                </>
            }
        >
            <CareerForm
                key={career?.id ?? 'new'}
                formId={FORM_ID}
                campaignId={campaignId}
                career={career}
                onSavingChange={setSaving}
                onDone={() => router.push(listHref)}
            />
        </HudFormPage>
    );
}
