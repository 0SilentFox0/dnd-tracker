'use client';

import { useTranslations } from 'next-intl';

import { ArtifactSetForm, type ArtifactSetFormProps } from './ArtifactSetForm';
import { ArtifactSetsList } from './ArtifactSetsList';

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
            <ArtifactSetForm
                campaignId={campaignId}
                heading={{ title: t('new.title'), aside: t('new.aside') }}
            />
        );

    if (view?.type === 'edit') {
        const edit = data as ArtifactSetEditData;

        return (
            <ArtifactSetForm
                campaignId={campaignId}
                heading={{ title: t('edit.title'), aside: edit.name }}
                setId={edit.setId}
                initial={edit.initial}
            />
        );
    }

    return <ArtifactSetsList campaignId={campaignId} />;
}
