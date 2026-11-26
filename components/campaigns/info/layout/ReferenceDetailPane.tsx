'use client';

import { useTranslations } from 'next-intl';

import { ArtifactReferenceDetail } from '../detail/ArtifactReferenceDetail';
import { ClassReferenceDetail } from '../detail/ClassReferenceDetail';
import { SkillReferenceDetail } from '../detail/SkillReferenceDetail';
import { SpellReferenceDetail } from '../detail/SpellReferenceDetail';

import { EmptyState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import type { ReferenceRef } from '@/lib/hooks/campaigns';
import type {
    ArtifactForReference,
    ArtifactSetForReference,
    ClassForReference,
    SkillForReference,
    SpellForReference,
} from '@/types/info-reference';

export interface ReferenceIndex {
    spell: Map<string, SpellForReference>;
    skill: Map<string, SkillForReference>;
    artifact: Map<string, ArtifactForReference>;
    class: Map<string, ClassForReference>;
}

export function referenceName(
    index: ReferenceIndex,
    ref: ReferenceRef | null
): string | null {
    return ref ? (index[ref.kind].get(ref.id)?.name ?? null) : null;
}

export function ReferenceDetailPane({
    campaignId,
    isDM,
    selected,
    index,
    sets,
    onReset,
}: {
    campaignId: string;
    isDM: boolean;
    selected: ReferenceRef | null;
    index: ReferenceIndex;
    sets: ArtifactSetForReference[];
    onReset?: () => void;
}) {
    const t = useTranslations('dashboard.reference');

    const spell = selected?.kind === 'spell' && index.spell.get(selected.id);

    const skill = selected?.kind === 'skill' && index.skill.get(selected.id);

    const artifact =
        selected?.kind === 'artifact' && index.artifact.get(selected.id);

    const gameClass =
        selected?.kind === 'class' && index.class.get(selected.id);

    if (spell)
        return (
            <SpellReferenceDetail
                key={spell.id}
                campaignId={campaignId}
                item={spell}
                isDM={isDM}
            />
        );

    if (skill)
        return (
            <SkillReferenceDetail
                key={skill.id}
                campaignId={campaignId}
                item={skill}
                isDM={isDM}
            />
        );

    if (artifact)
        return <ArtifactReferenceDetail item={artifact} sets={sets} />;

    if (gameClass) return <ClassReferenceDetail item={gameClass} />;

    return (
        <EmptyState
            title={t(onReset ? 'empty.nothing' : 'detail.empty')}
            description={onReset ? t('empty.nothingHint') : undefined}
            action={
                onReset ? (
                    <Button variant="outline" onClick={onReset}>
                        {t('empty.resetAll')}
                    </Button>
                ) : undefined
            }
        />
    );
}
