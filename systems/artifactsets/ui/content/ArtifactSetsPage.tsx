'use client';

import { useTranslations } from 'next-intl';

import { ArtifactSetForm, type ArtifactSetFormProps } from './ArtifactSetForm';
import { ArtifactSetsList } from './ArtifactSetsList';

import { HudFormPage } from '@/components/hud/form';
import type { DmPageProps } from '@/components/systems/types';

export interface ArtifactSetEditData {
    name: string;
    setId: string;
    initial: ArtifactSetFormProps['initial'];
}

export function ArtifactSetsPage({ campaignId, view, data }: DmPageProps) {
    const t = useTranslations('artifacts.sets');

    if (view?.type === 'new')
        return (
            <HudFormPage title={t('new.title')} aside={t('new.aside')}>
                <ArtifactSetForm campaignId={campaignId} />
            </HudFormPage>
        );

    if (view?.type === 'edit') {
        const edit = data as ArtifactSetEditData;

        return (
            <HudFormPage title={t('edit.title')} aside={edit.name}>
                <ArtifactSetForm
                    campaignId={campaignId}
                    setId={edit.setId}
                    initial={edit.initial}
                />
            </HudFormPage>
        );
    }

    return <ArtifactSetsList campaignId={campaignId} />;
}
