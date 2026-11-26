'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ArtifactForm } from './ArtifactForm';

import { SourceNotes } from '@/components/content-import/shared/SourceNotes';
import { ArtifactRarity } from '@/lib/constants/artifacts';
import { useDeleteArtifact, useUpdateArtifact } from '@/lib/hooks/artifacts';
import { useHasSourceNotes } from '@/lib/hooks/compendium-import';
import type { ArtifactData, ArtifactSetOption } from '@/types/artifacts';

interface ArtifactEditFormProps {
    campaignId: string;
    artifact: ArtifactData;
    artifactSets: ArtifactSetOption[];
}

export function ArtifactEditForm({
    campaignId,
    artifact,
    artifactSets,
}: ArtifactEditFormProps) {
    const t = useTranslations('artifacts.form');

    const tc = useTranslations('common.actions');

    const router = useRouter();

    const update = useUpdateArtifact(campaignId);

    const remove = useDeleteArtifact(campaignId);

    const hasNotes = useHasSourceNotes(campaignId, 'artifacts', artifact.id);

    return (
        <ArtifactForm
            campaignId={campaignId}
            artifactSets={artifactSets}
            mode="edit"
            labels={{
                title: t('editTitle'),
                description: t('editDescription'),
                submit: tc('save'),
                saving: tc('saving'),
                iconHint: t('editIconHint', { bucket: 'artifact-icons' }),
            }}
            side={
                hasNotes ? (
                    <SourceNotes
                        campaignId={campaignId}
                        kind="artifacts"
                        targetId={artifact.id}
                    />
                ) : undefined
            }
            initial={{
                name: artifact.name,
                description: artifact.description || '',
                rarity: artifact.rarity || ArtifactRarity.COMMON,
                slot: artifact.slot,
                icon: artifact.icon || '',
                setId: artifact.setId,
                abilities: artifact.abilities,
                abilityIssues: artifact.abilityIssues,
                weapon: artifact.weapon,
                armor: artifact.armor ?? null,
                item: artifact.item ?? undefined,
                systemStats: artifact.systemStats ?? undefined,
            }}
            actions={{
                cancelHref: `/campaigns/${campaignId}/dm/artifacts`,
                onSubmit: async (payload) => {
                    await update.mutateAsync({
                        artifactId: artifact.id,
                        data: payload,
                    });
                    router.push(`/campaigns/${campaignId}/dm/artifacts`);
                    router.refresh();
                },
                onDelete: async () => {
                    await remove.mutateAsync(artifact.id);
                    router.push(`/campaigns/${campaignId}/dm/artifacts`);
                    router.refresh();
                },
            }}
        />
    );
}
