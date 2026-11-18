import type { Prisma } from '@prisma/client';

import { textRef } from '@/lib/i18n/text-ref';
import {
    type Ability,
    AbilitySchema,
    type ConversionIssue,
    parseAbilities,
} from '@/lib/utils/abilities/schema';
import { readChoices } from '@/lib/utils/characters/choices/read';
import { fromJson, toInputJson } from '@/lib/utils/common/json';
import {
    moduleVocab,
    type ModuleVocabId,
} from '@/lib/utils/rules/systems/vocab';
import type { Choice } from '@/types/choices';
import type { ClassFeature } from '@/types/classes';

const CORE_OWNER_KINDS = {
    SKILL: 'skill',
    RACE: 'race',
    CLASS: 'class',
    ARTIFACT: 'artifact',
    UNIT: 'unit',
    FEAT: 'feat',
} as const;

type ModuleOwnerKind = ModuleVocabId<'abilitySources'>;

export type OwnerKind =
    | (typeof CORE_OWNER_KINDS)[keyof typeof CORE_OWNER_KINDS]
    | ModuleOwnerKind;

/** Core kinds by name plus every module's ability source by its own id (e.g. `OwnerKind.artifactSet`) */
export const OwnerKind = {
    ...CORE_OWNER_KINDS,
    ...(Object.fromEntries(
        moduleVocab('abilitySources').map((e) => [e.id, e.id])
    ) as { readonly [K in ModuleOwnerKind]: K }),
} as const;

type OwnerRow = { id: string; abilities?: unknown };

function read(row: OwnerRow): Ability[] {
    const parsed = parseAbilities(row.abilities);

    if (parsed) return parsed;

    if (Array.isArray(row.abilities)) {
        const valid = row.abilities.flatMap((a) => {
            const r = AbilitySchema.safeParse(a);

            return r.success ? [r.data] : [];
        });

        console.warn(
            `[abilities] ${row.abilities.length - valid.length} invalid abilities dropped for ${row.id}`
        );

        return valid;
    }

    if (row.abilities !== null && row.abilities !== undefined)
        console.warn(`[abilities] invalid JSON for ${row.id}`);

    return [];
}

export const skillAbilities = (row: OwnerRow) => read(row);

export const raceAbilities = (row: OwnerRow) => read(row);

export const artifactAbilities = (row: OwnerRow) => read(row);

export const ownerAbilities = (row: OwnerRow) => read(row);

export const unitAbilities = (row: OwnerRow) => read(row);

export const featAbilities = (row: OwnerRow) => read(row);

export const abilitySpellIds = (
    abilities: readonly Pick<Ability, 'perform'>[] | undefined
): string[] =>
    (abilities ?? []).flatMap((a) =>
        a.perform?.kind === 'spell' ? [a.perform.spellId] : []
    );

export function abilitiesJson(abilities: Ability[]): Prisma.InputJsonValue {
    return toInputJson(abilities);
}

export function readAbilities(
    _kind: OwnerKind,
    row: OwnerRow
): { abilities: Ability[]; issues: ConversionIssue[] } {
    const parsed = parseAbilities(row.abilities);

    if (parsed) return { abilities: parsed, issues: [] };

    // stored list stays authoritative: the editor shows broken entries instead of dropping them
    if (Array.isArray(row.abilities)) {
        return {
            abilities: row.abilities.filter(
                (a): a is Ability =>
                    !!a && typeof a === 'object' && !Array.isArray(a)
            ),
            issues: [
                {
                    severity: 'loss',
                    message: textRef('abilities.read.partialInvalid'),
                },
            ],
        };
    }

    if (row.abilities !== null && row.abilities !== undefined) {
        return {
            abilities: [],
            issues: [
                {
                    severity: 'loss',
                    message: textRef('abilities.read.columnInvalid'),
                },
            ],
        };
    }

    return { abilities: [], issues: [] };
}

export function withAbilityIssues<R extends OwnerRow, B extends object = R>(
    kind: OwnerKind,
    row: R,
    base: B = fromJson<B>(row)
) {
    const { abilities, issues: abilityIssues } = readAbilities(kind, row);

    return { ...base, abilities, abilityIssues };
}

export function readChoiceList(raw: unknown): Choice[] {
    return readChoices(raw).map((c) =>
        c.options
            ? {
                  ...c,
                  options: c.options.map((o) => ({
                      ...o,
                      abilities: read({
                          id: `choice-option@${c.id}.${o.id}`,
                          abilities: o.abilities,
                      }),
                  })),
              }
            : c
    );
}

export function classFeatureAbilities(features: unknown): ClassFeature[] {
    if (!Array.isArray(features)) return [];

    return features.flatMap((f): ClassFeature[] => {
        if (!f || typeof f !== 'object') return [];

        const { level, abilities, choices, description } = f as {
            level?: unknown;
            abilities?: unknown;
            choices?: unknown;
            description?: unknown;
        };

        if (
            typeof level !== 'number' ||
            !Number.isInteger(level) ||
            level < 1 ||
            level > 20
        )
            return [];

        const list = readChoiceList(choices);

        return [
            {
                level,
                ...(typeof description === 'string' && { description }),
                abilities: read({ id: `class-feature@${level}`, abilities }),
                ...(list.length > 0 && { choices: list }),
            },
        ];
    });
}
