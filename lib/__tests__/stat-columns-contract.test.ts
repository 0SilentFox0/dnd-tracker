import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { D6POOL_SYSTEM } from './fixtures/d6pool/definition';

import {
    CHARACTER_SYSTEM_COLUMNS,
    type CharacterSystemColumn,
} from '@/lib/constants/stat-columns';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { parseRules } from '@/lib/utils/rules/schema';
import { moduleCatalog } from '@/lib/utils/rules/systems/catalog';
import { RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';
import { ruleSystemOf } from '@/lib/utils/rules/systems/registry';
import {
    statColumnFillOf,
    statColumnsOf,
} from '@/lib/utils/rules/systems/stats';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';

const characterModel = () => {
    const schema = fs.readFileSync(
        path.resolve(__dirname, '../../prisma/schema.prisma'),
        'utf8'
    );

    const body = /^model Character \{\n([\s\S]*?)^\}/m.exec(schema)?.[1] ?? '';

    return new Map(
        [...body.matchAll(/^\s{2}(\w+)\s+(\w+)(\?|\[\])?\s/gm)].map((m) => [
            m[1],
            m[3] !== '?',
        ])
    );
};

const model = characterModel();

const NOT_NULL = CHARACTER_SYSTEM_COLUMNS.filter(
    (c): c is CharacterSystemColumn => model.get(c) === true
);

describe('NOT NULL columns come from the Prisma schema', () => {
    it('every system column is a Character field', () =>
        expect(CHARACTER_SYSTEM_COLUMNS.filter((c) => !model.has(c))).toEqual(
            []
        ));

    it('the optional ones are not demanded', () => {
        expect(NOT_NULL).toContain('class');
        expect(NOT_NULL).not.toContain('subclass');
        expect(NOT_NULL).not.toContain('archetype');
    });
});

const compositions: [string, RuleSystemDefinition][] = [
    ...RULE_SYSTEM_KEYS.map((key): [string, RuleSystemDefinition] => [
        key,
        ruleSystemOf(parseRules({ system: { key } })),
    ]),
    ...moduleCatalog()
        .addons.filter((m) => m.requires.every((r) => r === 'd20'))
        .map((m): [string, RuleSystemDefinition] => [
            `dnd5e+${m.id}`,
            ruleSystemOf(
                parseRules({ system: { key: 'dnd5e', modules: [m.id] } })
            ),
        ]),
];

describe('stats.columns owns', () => {
    it.each(compositions)('%s: parts never overlap', (_name, def) => {
        const seen = new Map<string, number>();

        (def.stats?.columns ?? []).forEach((part, index) => {
            for (const column of part.owns) {
                expect(
                    seen.has(column),
                    `column "${column}" is owned by parts ${seen.get(column)} and ${index}`
                ).toBe(false);

                seen.set(column, index);
            }
        });
    });

    it('homm (d20 + heroscaling) owns every column', () =>
        expect(
            CHARACTER_SYSTEM_COLUMNS.filter(
                (c) => !statColumnsOf(ruleSystemOf(DEFAULT_RULES)).has(c)
            )
        ).toEqual([]));
});

describe('stats.columns fill', () => {
    const persisted = [
        ...compositions.filter(([, def]) => def.characteristics.persisted),
        ['d6pool', D6POOL_SYSTEM] as [string, RuleSystemDefinition],
    ];

    it('has a persisted system to check', () =>
        expect(persisted.length).toBeGreaterThan(0));

    it.each(persisted)(
        '%s: fill covers every unowned NOT NULL column',
        (_n, def) => {
            const owned = statColumnsOf(def);

            const fill = statColumnFillOf(def, DEFAULT_RULES);

            const missing = NOT_NULL.filter(
                (c) => !owned.has(c) && !(c in fill)
            );

            expect(missing).toEqual([]);
        }
    );
});
