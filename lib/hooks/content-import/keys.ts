import type { QueryKey } from '@tanstack/react-query';

import { artifactKeys } from '@/lib/hooks/artifacts/keys';
import { backgroundKeys } from '@/lib/hooks/backgrounds/keys';
import { classKeys } from '@/lib/hooks/classes/keys';
import { featKeys } from '@/lib/hooks/feats/keys';
import { raceKeys } from '@/lib/hooks/races/keys';
import { skillKeys } from '@/lib/hooks/skills/keys';
import { spellKeys } from '@/lib/hooks/spells/keys';
import { unitKeys, unitWriteKeys } from '@/lib/hooks/units/keys';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';
import type { ImportKind } from '@/types/content-import';

export const contentImportKeys = {
    aiAvailability: (campaignId: string, kind: ImportKind) =>
        ['content-import-ai', campaignId, kind] as const,
    fallbackList: (campaignId: string, kind: ImportKind) =>
        [kind, campaignId] as const,
};

/** Kinds a module owns keep the `[kind, campaignId]` list key */
const INVALIDATE: Partial<
    Record<ImportKind, (campaignId: string) => QueryKey[]>
> = {
    units: unitWriteKeys,
    spells: (c) => [spellKeys.list(c)],
    skills: (c) => [skillKeys.list(c)],
    'main-skills': (c) => [skillKeys.mainSkills(c), skillKeys.list(c)],
    'spell-groups': (c) => [spellKeys.groups(c), spellKeys.list(c)],
    races: (c) => [raceKeys.list(c), unitKeys.list(c)],
    classes: (c) => [classKeys.list(c)],
    backgrounds: (c) => [backgroundKeys.list(c)],
    feats: (c) => [featKeys.list(c)],
    artifacts: (c) => [artifactKeys.list(c)],
};

const ownKeys = (campaignId: string, kind: ImportKind): QueryKey[] =>
    INVALIDATE[kind]?.(campaignId) ?? [
        contentImportKeys.fallbackList(campaignId, kind),
    ];

const linkedKinds = (kind: ImportKind): string[] =>
    (SYSTEM_META as readonly SystemMeta[]).flatMap(
        (m) => m.importLinks?.[kind] ?? []
    );

/** Own keys of the kind plus those of the kinds linked by modules (one level) */
export const importInvalidateKeys = (
    campaignId: string,
    kind: ImportKind
): QueryKey[] => [
    ...ownKeys(campaignId, kind),
    ...linkedKinds(kind).flatMap((link) =>
        ownKeys(campaignId, link as ImportKind)
    ),
];
