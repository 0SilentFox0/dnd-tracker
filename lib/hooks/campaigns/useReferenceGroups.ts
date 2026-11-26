'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { RefKey } from './useReferenceSelection';

import { groupDisplayName, UNGROUPED_KEY } from '@/lib/constants/ungrouped';
import { ITEM_SET_KEY } from '@/lib/utils/artifacts/item-set-key';
import { groupBy } from '@/lib/utils/common/collections';
import type {
    ArtifactForReference,
    ClassForReference,
    SectionTab,
    SkillForReference,
    SpellForReference,
} from '@/types/info-reference';

export type ReferenceEntry =
    | { key: RefKey; kind: 'spell'; item: SpellForReference }
    | { key: RefKey; kind: 'skill'; item: SkillForReference }
    | { key: RefKey; kind: 'artifact'; item: ArtifactForReference }
    | { key: RefKey; kind: 'class'; item: ClassForReference };

export interface ReferenceGroup {
    key: string;
    title: string;
    accent?: string;
    section: SectionTab;
    total: number;
    entries: ReferenceEntry[];
}

interface Options {
    section: SectionTab;
    skills: SkillForReference[];
    spells: SpellForReference[];
    artifacts: ArtifactForReference[];
    classes: ClassForReference[];
    limit: number;
}

const byName = ([a]: [string, unknown], [b]: [string, unknown]) => {
    if (a === UNGROUPED_KEY) return 1;

    if (b === UNGROUPED_KEY) return -1;

    return a.localeCompare(b);
};

export function useReferenceGroups({
    section,
    skills,
    spells,
    artifacts,
    classes,
    limit,
}: Options) {
    const t = useTranslations('dashboard.reference.sections');

    const tu = useTranslations('gameTerms.ungrouped');

    return useMemo(() => {
        const entries = {
            classes: classes.map<ReferenceEntry>((item) => ({
                key: `class:${item.id}`,
                kind: 'class',
                item,
            })),
            skills: skills.map<ReferenceEntry>((item) => ({
                key: `skill:${item.id}`,
                kind: 'skill',
                item,
            })),
            spells: spells.map<ReferenceEntry>((item) => ({
                key: `spell:${item.id}`,
                kind: 'spell',
                item,
            })),
            artifacts: artifacts.map<ReferenceEntry>((item) => ({
                key: `artifact:${item.id}`,
                kind: 'artifact',
                item,
            })),
        };

        const all = [
            ...entries.classes,
            ...entries.skills,
            ...entries.spells,
            ...entries.artifacts,
        ];

        const grouped = (
            kind: 'skills' | 'spells' | 'artifacts',
            keyOf: (e: ReferenceEntry) => string | null,
            label: string,
            accentOf?: (e: ReferenceEntry) => string | null
        ): ReferenceGroup[] =>
            Array.from(groupBy(entries[kind], (e) => keyOf(e) ?? UNGROUPED_KEY))
                .sort(byName)
                .map(([name, list]) => ({
                    key: `${kind}:${name}`,
                    title: groupDisplayName(name, label),
                    accent: accentOf?.(list[0]) ?? undefined,
                    section: kind,
                    total: list.length,
                    entries: list,
                }));

        let groups: ReferenceGroup[];

        if (section === 'all') {
            groups = (['classes', 'skills', 'spells', 'artifacts'] as const)
                .filter((kind) => entries[kind].length > 0)
                .map((kind) => ({
                    key: kind,
                    title: t(`${kind}.title`),
                    section: kind,
                    total: entries[kind].length,
                    entries: entries[kind].slice(0, limit),
                }));
        } else if (section === 'classes') {
            groups = [
                {
                    key: 'classes',
                    title: t('classes.title'),
                    section,
                    total: entries.classes.length,
                    entries: entries.classes,
                },
            ];
        } else if (section === 'skills') {
            groups = grouped(
                'skills',
                (e) => (e.kind === 'skill' ? e.item.mainSkillName : null),
                tu('branch'),
                (e) => (e.kind === 'skill' ? e.item.mainSkillColor : null)
            );
        } else if (section === 'spells') {
            groups = grouped(
                'spells',
                (e) => (e.kind === 'spell' ? e.item.groupName : null),
                tu('spellGroup')
            );
        } else {
            groups = grouped(
                'artifacts',
                (e) => (e.kind === 'artifact' ? e.item.setName : null),
                tu(ITEM_SET_KEY)
            );
        }

        const visible = groups.flatMap((g) => g.entries);

        return {
            groups: groups.filter((g) => g.entries.length > 0),
            visible,
            byKey: new Map(all.map((e) => [e.key, e])),
            totals: {
                all: all.length,
                classes: entries.classes.length,
                skills: entries.skills.length,
                spells: entries.spells.length,
                artifacts: entries.artifacts.length,
            } satisfies Record<SectionTab, number>,
        };
    }, [section, skills, spells, artifacts, classes, limit, t, tu]);
}
