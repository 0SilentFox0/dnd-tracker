import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { CONTENT_KINDS } from '@/lib/constants/content-kinds';
import {
    SYSTEM_META,
    type SystemMeta,
    type VocabKind,
} from '@/lib/utils/rules/systems/meta';
import {
    moduleVocab,
    type ModuleVocabId,
    vocabIds,
} from '@/lib/utils/rules/systems/vocab';

const ROOT = path.resolve(__dirname, '../../../../..');

const FROZEN: Record<VocabKind, string[]> = {
    abilitySources: ['artifactSet'],
    abilityStats: ['morale'],
    abilityLimitFlags: ['lair'],
    actionTypes: ['retaliation', 'opportunity', 'morale_skip'],
    legendaryKinds: ['lair'],
    rollKinds: ['morale'],
    combatStats: ['morale'],
    logFields: ['morale'],
    equipSlots: ['offHand'],
    characterLogTypes: ['inspiration'],
    unitImportFields: ['morale'],
};

const ids = (kind: VocabKind) => moduleVocab(kind).map((e) => e.id);

describe('module vocab', () => {
    it.each(Object.entries(FROZEN))(
        '%s equals the hardcoded set',
        (kind, expected) =>
            expect(ids(kind as VocabKind).sort()).toEqual([...expected].sort())
    );

    it('keeps modules outside any composition in the vocabulary', () => {
        const owners = (SYSTEM_META as readonly SystemMeta[])
            .filter((m) => m.vocab?.equipSlots)
            .map((m) => m.module);

        expect(owners).toEqual(['offhand']);
        expect(vocabIds('equipSlots').has('offHand')).toBe(true);
        expect(vocabIds('abilitySources').has('artifactSet')).toBe(true);
    });

    it('derives literal ids from the meta', () => {
        expectTypeOf<ModuleVocabId<'actionTypes'>>().toEqualTypeOf<
            'retaliation' | 'opportunity' | 'morale_skip'
        >();
        expectTypeOf<ModuleVocabId<'equipSlots'>>().toEqualTypeOf<'offHand'>();
    });

    it('log field codes do not clash with core codec keys', () => {
        const src = readFileSync(
            path.join(ROOT, 'lib/utils/battle/log/codec.ts'),
            'utf8'
        );

        const block = /const PARAM_KEYS[\s\S]*?\];/.exec(src)?.[0] ?? '';

        const core = [...block.matchAll(/\['(\w)', '(\w+)'\]/g)].map(
            (m) => [m[1], m[2]] as const
        );

        const fields = moduleVocab('logFields');

        expect(new Set(fields.map((f) => f.code)).size).toBe(fields.length);

        for (const { id, code } of fields) {
            expect(code).toHaveLength(1);

            for (const [c, k] of core) {
                if (c === code) expect(k).toBe(id);

                if (k === id) expect(c).toBe(code);
            }
        }
    });

    it('importLinks reference known content kinds', () => {
        const known = new Set<string>(CONTENT_KINDS);

        for (const m of SYSTEM_META as readonly SystemMeta[])
            for (const [k, links] of Object.entries(m.importLinks ?? {})) {
                expect(known.has(k)).toBe(true);

                for (const l of links) expect(known.has(l)).toBe(true);
            }
    });
});
