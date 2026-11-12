import type { PackKind } from '@/lib/utils/templates/manifest';

/** Row references inside JSON columns (not name-mapped by the importer): the pack keeps slugs, the DB holds ids. */
export const JSON_REFS: Readonly<Record<string, PackKind>> = {
    spellIds: 'spells',
    unitId: 'units',
    raceId: 'races',
};

/** JSON columns that may hold `JSON_REFS` keys, by kind. */
export const JSON_REF_COLUMNS: Partial<Record<PackKind, readonly string[]>> = {
    spells: ['spellEffects', 'raceModifiers'],
    units: ['abilities'],
    skills: ['abilities'],
    races: ['abilities'],
    artifacts: ['abilities'],
    'artifact-sets': ['abilities'],
};

export type RefSwap = (kind: PackKind, value: string) => string;

/** Maps the referenced strings under `JSON_REFS` keys at any depth. */
export function mapJsonRefs(value: unknown, swap: RefSwap): unknown {
    if (Array.isArray(value)) return value.map((v) => mapJsonRefs(v, swap));

    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
        Object.entries(value).map(([key, v]) => {
            const kind = JSON_REFS[key];

            if (kind && typeof v === 'string') return [key, swap(kind, v)];

            if (kind && Array.isArray(v))
                return [
                    key,
                    v.map((item) =>
                        typeof item === 'string'
                            ? swap(kind, item)
                            : mapJsonRefs(item, swap)
                    ),
                ];

            return [key, mapJsonRefs(v, swap)];
        })
    );
}

export const slugsToIds =
    (idBySlug: Record<string, Record<string, string>>): RefSwap =>
    (kind, value) =>
        idBySlug[kind]?.[value] ?? value;
