'use client';

import { useTranslations } from 'next-intl';

import { ArtifactReferenceDetail } from './detail/ArtifactReferenceDetail';
import { ArtifactSetBlock } from './detail/ArtifactSetBlock';
import { ClassReferenceDetail } from './detail/ClassReferenceDetail';
import { SkillReferenceDetail } from './detail/SkillReferenceDetail';
import { SpellReferenceDetail } from './detail/SpellReferenceDetail';
import { ReferenceList } from './layout/ReferenceList';
import { ReferenceRail } from './layout/ReferenceRail';
import { ArtifactReferenceRow } from './rows/ArtifactReferenceRow';
import { ClassReferenceRow } from './rows/ClassReferenceRow';
import { SkillReferenceRow } from './rows/SkillReferenceRow';
import { SpellReferenceRow } from './rows/SpellReferenceRow';

import { EmptyState } from '@/components/common/states';
import { HudSplit } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import {
    type ReferenceEntry,
    type RefKey,
    useInfoReferenceFilters,
    useReferenceGroups,
    useReferenceSelection,
} from '@/lib/hooks/campaigns';
import { useIsCompact } from '@/lib/hooks/common';
import type {
    ArtifactForReference,
    ArtifactSetForReference,
    ClassForReference,
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

const ALL_PREVIEW = 6;

function rowOf(
    entry: ReferenceEntry,
    row: {
        selected: boolean;
        onSelect: () => void;
        tabIndex: 0 | -1;
        ref: (el: HTMLElement | null) => void;
    }
) {
    const props = {
        selected: row.selected,
        onSelect: row.onSelect,
        tabIndex: row.tabIndex,
        register: row.ref,
    };

    switch (entry.kind) {
        case 'spell':
            return <SpellReferenceRow item={entry.item} {...props} />;
        case 'skill':
            return <SkillReferenceRow item={entry.item} {...props} />;
        case 'artifact':
            return <ArtifactReferenceRow item={entry.item} {...props} />;
        case 'class':
            return <ClassReferenceRow item={entry.item} {...props} />;
    }
}

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

    const isMobile = useIsCompact();

    const { filters, results } = useInfoReferenceFilters(
        skills,
        spells,
        artifacts,
        classes
    );

    const section = filters.section;

    const view = useReferenceGroups({
        section: section.value,
        skills: results.filteredSkills,
        spells: results.filteredSpells,
        artifacts: results.filteredArtifacts,
        classes: results.filteredClasses,
        limit:
            section.value === 'all' && !filters.search.value.trim()
                ? ALL_PREVIEW
                : Number.POSITIVE_INFINITY,
    });

    const selection = useReferenceSelection({
        visible: view.visible.map((e) => e.key),
        section,
        autoSelect: !isMobile,
    });

    const entry = selection.selected
        ? view.byKey.get(selection.selected)
        : undefined;

    const emptyState =
        view.totals.all === 0 ? (
            <EmptyState
                title={t('empty.nothing')}
                description={t('empty.nothingHint')}
                action={
                    <Button variant="outline" onClick={filters.clearAll}>
                        {t('empty.resetAll')}
                    </Button>
                }
            />
        ) : (
            <EmptyState title={t('detail.empty')} />
        );

    const setOf =
        entry?.kind === 'artifact' && entry.item.setName
            ? artifactSets.find((s) => s.name === entry.item.setName)
            : undefined;

    const detail = entry ? (
        <div className="space-y-4" key={entry.key}>
            {entry.kind === 'spell' && (
                <SpellReferenceDetail
                    key={entry.item.id}
                    campaignId={campaignId}
                    item={entry.item}
                    isDM={isDM}
                />
            )}
            {entry.kind === 'skill' && (
                <SkillReferenceDetail
                    key={entry.item.id}
                    campaignId={campaignId}
                    item={entry.item}
                    isDM={isDM}
                />
            )}
            {entry.kind === 'artifact' && (
                <ArtifactReferenceDetail
                    key={entry.item.id}
                    campaignId={campaignId}
                    item={entry.item}
                    isDM={isDM}
                />
            )}
            {entry.kind === 'class' && (
                <ClassReferenceDetail
                    key={entry.item.id}
                    campaignId={campaignId}
                    item={entry.item}
                    isDM={isDM}
                />
            )}
            {setOf && <ArtifactSetBlock set={setOf} />}
        </div>
    ) : (
        emptyState
    );

    return (
        <HudSplit
            rail={<ReferenceRail filters={filters} counts={view.totals} />}
            aside={{
                content: detail,
                width: 'md',
                title: entry?.item.name ?? t('detail.empty'),
                mobile: { open: selection.isOpen, onClose: selection.clear },
            }}
        >
            <ReferenceList<ReferenceEntry>
                groups={view.groups.map((g) => ({
                    key: g.key,
                    accent: g.accent,
                    items: g.entries,
                    title:
                        g.total > g.entries.length ? (
                            <span className="flex items-center justify-between gap-2">
                                {g.title}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => section.set(g.section)}
                                >
                                    {t('list.showAll', {
                                        count: g.total,
                                    })}
                                </Button>
                            </span>
                        ) : (
                            g.title
                        ),
                }))}
                selected={selection.selected}
                onSelect={(key) => selection.select(key as RefKey)}
                keyOf={(e) => e.key}
                renderRow={rowOf}
            />
        </HudSplit>
    );
}
