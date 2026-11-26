'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { groupSorted, singleGroup } from './layout/reference-groups';
import type { ReferenceIndex } from './layout/ReferenceDetailPane';
import {
    ReferenceDetailPane,
    referenceName,
} from './layout/ReferenceDetailPane';
import { ReferenceLayout } from './layout/ReferenceLayout';
import { ReferenceList } from './layout/ReferenceList';
import { ReferenceRail } from './layout/ReferenceRail';
import { ArtifactReferenceRow } from './rows/ArtifactReferenceRow';
import { ClassReferenceRow } from './rows/ClassReferenceRow';
import { SkillReferenceRow } from './rows/SkillReferenceRow';
import { SpellReferenceRow } from './rows/SpellReferenceRow';
import { ReferenceSearchBar } from './ReferenceSearchBar';

import { EmptyState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import {
    type ReferenceRef,
    useInfoReferenceFilters,
    useReferenceSelection,
} from '@/lib/hooks/campaigns';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';
import { ITEM_SET_KEY } from '@/lib/utils/artifacts/item-set-key';
import type {
    ArtifactForReference,
    ArtifactSetForReference,
    ClassForReference,
    SectionTab,
    SkillForReference,
    SpellForReference,
} from '@/types/info-reference';

export interface InfoReferenceClientProps {
    campaignId: string;
    skills: SkillForReference[];
    spells: SpellForReference[];
    artifacts: ArtifactForReference[];
    artifactSets: ArtifactSetForReference[];
    classes: ClassForReference[] | null;
    isDM: boolean;
}

const ALL_LIMIT = 6;

const byId = <T extends { id: string }>(items: T[]) =>
    new Map(items.map((item) => [item.id, item]));

export function InfoReferenceClient({
    campaignId,
    skills,
    spells,
    artifacts,
    artifactSets,
    classes,
    isDM,
}: InfoReferenceClientProps) {
    const t = useTranslations('dashboard.reference');

    const tu = useTranslations('gameTerms.ungrouped');

    const isDesktop = useMediaQuery(DESKTOP_QUERY, true);

    const { filters, results } = useInfoReferenceFilters(
        skills,
        spells,
        artifacts,
        classes
    );

    const {
        filteredClasses,
        filteredSkills,
        filteredSpells,
        filteredArtifacts,
    } = results;

    const section = filters.section.value;

    const isAll = section === 'all';

    const showClasses = filters.visible.classes;

    const showSkills = filters.visible.skills;

    const limit = isAll && !filters.search.value.trim() ? ALL_LIMIT : undefined;

    const counts: Record<SectionTab, number> = {
        classes: filteredClasses.length,
        skills: filteredSkills.length,
        spells: filteredSpells.length,
        artifacts: filteredArtifacts.length,
        all:
            (classes ? filteredClasses.length : filteredSkills.length) +
            filteredSpells.length +
            filteredArtifacts.length,
    };

    const found = isAll ? counts.all : counts[section];

    const refs = useMemo<ReferenceRef[]>(
        () => [
            ...(showClasses ? filteredClasses : []).map((c) => ({
                kind: 'class' as const,
                id: c.id,
            })),
            ...(showSkills ? filteredSkills : []).map((s) => ({
                kind: 'skill' as const,
                id: s.id,
            })),
            ...(filters.visible.spells ? filteredSpells : []).map((s) => ({
                kind: 'spell' as const,
                id: s.id,
            })),
            ...(filters.visible.artifacts ? filteredArtifacts : []).map(
                (a) => ({ kind: 'artifact' as const, id: a.id })
            ),
        ],
        [
            showClasses,
            showSkills,
            filters.visible.spells,
            filters.visible.artifacts,
            filteredClasses,
            filteredSkills,
            filteredSpells,
            filteredArtifacts,
        ]
    );

    const { selected, select, clear, isOpen } = useReferenceSelection(refs, {
        autoSelect: isDesktop,
    });

    const index = useMemo<ReferenceIndex>(
        () => ({
            spell: byId(spells),
            skill: byId(skills),
            artifact: byId(artifacts),
            class: byId(classes ?? []),
        }),
        [spells, skills, artifacts, classes]
    );

    const classGroups = singleGroup(
        'classes',
        t('sections.classes.title'),
        filteredClasses
    );

    const skillGroups = isAll
        ? singleGroup('skills', t('sections.skills.title'), filteredSkills)
        : groupSorted(
              filteredSkills,
              (s) => s.mainSkillName,
              tu('branch'),
              (s) => s.mainSkillColor
          );

    const spellGroups = isAll
        ? singleGroup('spells', t('sections.spells.title'), filteredSpells)
        : groupSorted(filteredSpells, (s) => s.groupName, tu('spellGroup'));

    const artifactGroups = isAll
        ? singleGroup(
              'artifacts',
              t('sections.artifacts.title'),
              filteredArtifacts
          )
        : groupSorted(filteredArtifacts, (a) => a.setName, tu(ITEM_SET_KEY));

    const pick = (kind: ReferenceRef['kind']) => (id: string) =>
        select({ kind, id });

    const chosen = (kind: ReferenceRef['kind']) =>
        selected?.kind === kind ? selected.id : null;

    const showAll = (value: SectionTab) =>
        limit ? () => filters.section.set(value) : undefined;

    const detailTitle = referenceName(index, selected) ?? t('detail.empty');

    return (
        <ReferenceLayout
            rail={<ReferenceRail filters={filters} counts={counts} />}
            list={
                <>
                    <ReferenceSearchBar filters={filters} found={found} />
                    {found === 0 && (
                        <EmptyState
                            title={t('empty.nothing')}
                            description={t('empty.nothingHint')}
                            action={
                                <Button
                                    variant="outline"
                                    onClick={filters.clearAll}
                                >
                                    {t('empty.resetAll')}
                                </Button>
                            }
                        />
                    )}
                    {showClasses && (
                        <ReferenceList
                            groups={classGroups}
                            selected={chosen('class')}
                            renderRow={(item, isSelected) => (
                                <ClassReferenceRow
                                    item={item}
                                    selected={isSelected}
                                    onSelect={pick('class')}
                                />
                            )}
                            limit={limit}
                            onShowAll={showAll('classes')}
                        />
                    )}
                    {showSkills && (
                        <ReferenceList
                            groups={skillGroups}
                            selected={chosen('skill')}
                            renderRow={(item, isSelected) => (
                                <SkillReferenceRow
                                    item={item}
                                    selected={isSelected}
                                    onSelect={pick('skill')}
                                />
                            )}
                            limit={limit}
                            onShowAll={showAll('skills')}
                        />
                    )}
                    {filters.visible.spells && (
                        <ReferenceList
                            groups={spellGroups}
                            selected={chosen('spell')}
                            renderRow={(item, isSelected) => (
                                <SpellReferenceRow
                                    item={item}
                                    selected={isSelected}
                                    onSelect={pick('spell')}
                                />
                            )}
                            limit={limit}
                            onShowAll={showAll('spells')}
                        />
                    )}
                    {filters.visible.artifacts && (
                        <ReferenceList
                            groups={artifactGroups}
                            selected={chosen('artifact')}
                            renderRow={(item, isSelected) => (
                                <ArtifactReferenceRow
                                    item={item}
                                    selected={isSelected}
                                    onSelect={pick('artifact')}
                                />
                            )}
                            limit={limit}
                            onShowAll={showAll('artifacts')}
                        />
                    )}
                </>
            }
            detail={
                <ReferenceDetailPane
                    campaignId={campaignId}
                    isDM={isDM}
                    selected={selected}
                    index={index}
                    sets={artifactSets}
                    onReset={
                        found === 0 && filters.hasActive
                            ? filters.clearAll
                            : undefined
                    }
                />
            }
            detailOpen={isOpen}
            onDetailClose={clear}
            detailTitle={detailTitle}
        />
    );
}
