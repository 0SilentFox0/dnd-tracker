import { describe, expect, it } from 'vitest';

import { expectLabelKeys } from '../test/label-keys';

import { optionSetKey } from '@/components/abilities/fields/registry-labels';
import { LOCALES } from '@/lib/i18n/config';
import { localSource } from '@/lib/i18n/local-source';
import { CONDITION_REGISTRY } from '@/lib/utils/abilities/registry/conditions';
import { EFFECT_REGISTRY } from '@/lib/utils/abilities/registry/effects';
import {
    FLAG_FIELDS,
    FLAG_KEYS,
} from '@/lib/utils/abilities/registry/effects/flags';
import {
    DURATION_FIELD,
    type FieldMeta,
    TARGET_FIELD,
} from '@/lib/utils/abilities/registry/fields';
import { TRIGGER_REGISTRY } from '@/lib/utils/abilities/registry/triggers';
import {
    FROM_SCRATCH_ID,
    RECIPE_CATEGORIES,
    RECIPES,
} from '@/lib/utils/abilities/templates';

const lookup = (tree: unknown, path: string) =>
    path
        .split('.')
        .reduce<unknown>(
            (node, part) =>
                (node as Record<string, unknown> | undefined)?.[part],
            tree
        );

// flags.* owners live in abilityEditor, the other owners in abilityRegistry
const owners: { owner: string; fields: readonly FieldMeta[] }[] = [
    ...Object.entries(EFFECT_REGISTRY).map(([k, d]) => ({
        owner: `effects.${k}`,
        fields: d.fields,
    })),
    ...Object.entries(FLAG_FIELDS).map(([k, f]) => ({
        owner: `flags.${k}`,
        fields: [...f, TARGET_FIELD, DURATION_FIELD],
    })),
    ...Object.entries(TRIGGER_REGISTRY).map(([k, d]) => ({
        owner: `triggers.${k}`,
        fields: d.fields,
    })),
    ...Object.entries(CONDITION_REGISTRY).map(([k, d]) => ({
        owner: `conditionTypes.${k}`,
        fields: d.fields,
    })),
];

describe('ability editor labels have translations', () => {
    expectLabelKeys('abilityEditor', 'optionGroups', [
        'conditionsStandard',
        'mechanicalConditions',
    ]);

    expectLabelKeys(
        'abilityEditor',
        'flags',
        FLAG_KEYS.map((id) => `${id}.label`)
    );

    expectLabelKeys('abilityEditor', 'templates', [
        ...RECIPES.flatMap((r) => [
            `${r.id}.label`,
            `${r.id}.hint`,
            `${r.id}.defaultName`,
            ...r.params.map((p) => `${r.id}.params.${p.key}`),
        ]),
        `${FROM_SCRATCH_ID}.defaultName`,
        `${FROM_SCRATCH_ID}.note`,
        ...RECIPE_CATEGORIES.map((c) => `categories.${c}`),
    ]);

    for (const locale of LOCALES) {
        it(`${locale}: every field label and option resolves (own key or shared)`, async () => {
            const registry = await localSource.load(locale, 'abilityRegistry');

            const editor = await localSource.load(locale, 'abilityEditor');

            const has = (tree: unknown, ...paths: string[]) =>
                paths.some((p) => typeof lookup(tree, p) === 'string');

            for (const { owner, fields } of owners) {
                const ownTree = owner.startsWith('flags.') ? editor : registry;

                for (const f of fields) {
                    expect(
                        has(ownTree, `${owner}.fields.${f.name}`) ||
                            has(editor, `fields.${f.name}`),
                        `${owner} field ${f.name}`
                    ).toBe(true);

                    if (owner === 'effects.flag' && f.name === 'flag') continue;

                    for (const o of f.options ?? []) {
                        const set = optionSetKey(f.name);

                        expect(
                            has(ownTree, `${owner}.${set}.${o.value}`) ||
                                has(registry, `${set}.${o.value}`),
                            `${owner} option ${f.name}.${o.value}`
                        ).toBe(true);
                    }
                }
            }
        });
    }
});
