import { SYSTEM_ABILITY_SOURCES } from './build/system-sources';
import {
    activeIds,
    effectKey,
    type EffectOwnership,
    isEffectInComposition,
} from './registry/effects/ownership';
import { SYSTEM_EFFECT_OWNERSHIP } from './registry/effects/system-rows';
import { SYSTEM_ABILITY_VARIABLES } from './registry/system-variables';
import { AbilitySchema } from './schema/ability';

import type { Composition } from '@/lib/utils/rules/systems/catalog';

export type ViolationReason = 'effect' | 'variable' | 'source' | 'schema';

export interface Violation {
    table: string;
    id: string;
    path: string;
    kind: string;
    reason: ViolationReason;
}

export interface OwnershipTable {
    table: string;
    /** Ability source type of the rows, when a module owns it */
    source?: string;
}

export const OWNERSHIP_TABLES: readonly OwnershipTable[] = [
    { table: 'skills', source: 'skill' },
    { table: 'artifact_sets', source: 'artifactSet' },
    { table: 'artifacts' },
    { table: 'races' },
    { table: 'feats' },
    { table: 'units' },
    { table: 'classes' },
    { table: 'spells' },
];

export interface AbilityPart {
    path: string;
    abilities: unknown;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v);

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Where a row keeps ability lists (classes: per feature and subclass feature; spells keep a bare effect list). */
export function partsOf(
    table: string,
    row: Record<string, unknown>
): AbilityPart[] {
    if (table === 'classes') {
        const features = (list: unknown, prefix: string) =>
            arr(list).map((f, i) => ({
                path: `${prefix}[${i}].abilities`,
                abilities: isRecord(f) ? f.abilities : undefined,
            }));

        return [
            ...features(row.features, 'features'),
            ...arr(row.subclasses).flatMap((s, i) =>
                features(
                    isRecord(s) ? s.features : undefined,
                    `subclasses[${i}].features`
                )
            ),
        ];
    }

    if (table === 'spells')
        return [
            {
                path: 'spellEffects',
                abilities: [{ effects: row.spellEffects }],
            },
        ];

    return [{ path: 'abilities', abilities: row.abilities }];
}

const variableOwners = new Map(
    SYSTEM_ABILITY_VARIABLES.flatMap((o) =>
        Object.keys(o.items).map((name) => [name, o.system] as const)
    )
);

const sourceOwners = new Map<string, string>(
    SYSTEM_ABILITY_SOURCES.flatMap((o) =>
        o.items.flatMap((hook) =>
            hook.types.map((type): [string, string] => [type, o.system])
        )
    )
);

const formulasIn = (node: unknown): string[] => {
    if (Array.isArray(node)) return node.flatMap(formulasIn);

    if (!isRecord(node)) return [];

    return Object.entries(node).flatMap(([key, value]) =>
        key === 'formula' && typeof value === 'string'
            ? [value]
            : formulasIn(value)
    );
};

function effectViolations(
    effect: unknown,
    path: string,
    base: Omit<Violation, 'path' | 'kind' | 'reason'>,
    c: Composition,
    own: EffectOwnership
): Violation[] {
    if (!isRecord(effect) || typeof effect.kind !== 'string') return [];

    const out: Violation[] = [];

    if (!isEffectInComposition(effect as { kind: string }, c, own))
        out.push({
            ...base,
            path,
            kind: effectKey(effect as { kind: string }),
            reason: 'effect',
        });

    const active = activeIds(c);

    for (const formula of formulasIn(effect)) {
        for (const [name, owner] of variableOwners)
            if (!active.has(owner) && new RegExp(`\\b${name}\\b`).test(formula))
                out.push({ ...base, path, kind: name, reason: 'variable' });
    }

    return [
        ...out,
        ...arr(effect.options).flatMap((o, i) =>
            effectViolations(o, `${path}.options[${i}]`, base, c, own)
        ),
    ];
}

/** Violations of one row against the composition of its campaign (read-only: nothing is parsed away or fixed). */
export function rowViolations(
    row: {
        table: string;
        id: string;
        source?: string;
        data: Record<string, unknown>;
    },
    c: Composition,
    own: EffectOwnership = SYSTEM_EFFECT_OWNERSHIP
): Violation[] {
    const base = { table: row.table, id: row.id };

    const out: Violation[] = [];

    for (const part of partsOf(row.table, row.data)) {
        const list = arr(part.abilities);

        if (row.source && list.length > 0) {
            const owner = sourceOwners.get(row.source);

            if (owner && !activeIds(c).has(owner))
                out.push({
                    ...base,
                    path: part.path,
                    kind: row.source,
                    reason: 'source',
                });
        }

        list.forEach((ability, i) => {
            const at = `${part.path}[${i}]`;

            if (
                row.table !== 'spells' &&
                !AbilitySchema.safeParse(ability).success
            )
                out.push({
                    ...base,
                    path: at,
                    kind: 'ability',
                    reason: 'schema',
                });

            if (isRecord(ability))
                arr(ability.effects).forEach((e, j) =>
                    out.push(
                        ...effectViolations(
                            e,
                            `${at}.effects[${j}]`,
                            base,
                            c,
                            own
                        )
                    )
                );
        });
    }

    return out;
}
