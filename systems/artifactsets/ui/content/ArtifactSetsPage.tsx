'use client';

import { ArtifactSetForm, type ArtifactSetFormProps } from './ArtifactSetForm';
import { ArtifactSetsList } from './ArtifactSetsList';

import type { DmPageProps } from '@/components/systems/types';

export interface ArtifactSetEditData {
    name: string;
    setId: string;
    initial: ArtifactSetFormProps['initial'];
}

export function ArtifactSetsPage({ campaignId, view, data }: DmPageProps) {
    if (view?.type === 'new')
        return <ArtifactSetForm campaignId={campaignId} />;

    if (view?.type === 'edit') {
        const edit = data as ArtifactSetEditData;

        return (
            <ArtifactSetForm
                campaignId={campaignId}
                setId={edit.setId}
                initial={{ ...edit.initial, name: edit.name }}
            />
        );
    }

    return <ArtifactSetsList campaignId={campaignId} />;
}
