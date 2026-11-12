import { describe, expect, it } from 'vitest';

import {
    composition,
    moduleCatalog,
    PRESETS,
    presetsOf,
    unknownIds,
} from '@/lib/utils/rules/systems/catalog';
import type { SystemMeta } from '@/lib/utils/rules/systems/meta';
import { RULE_SYSTEM_KEYS } from '@/lib/utils/rules/systems/meta';

const metas: SystemMeta[] = [
    { module: 'core', kind: 'base', keys: ['plain'], i18n: {} },
    { module: 'a', kind: 'addon', keys: [], requires: ['core'], i18n: {} },
    {
        module: 'b',
        kind: 'addon',
        keys: [],
        requires: ['core'],
        toggle: 'setup',
        i18n: {},
    },
    {
        module: 'combo',
        kind: 'preset',
        keys: ['combo'],
        preset: { base: 'core', modules: ['b', 'a'] },
        i18n: {},
    },
];

describe('catalog', () => {
    it('derives presets from meta', () => {
        expect(presetsOf(metas)).toEqual({
            plain: { base: 'core', modules: [] },
            combo: { base: 'core', modules: ['b', 'a'] },
        });
    });

    it('exposes every rule system key as a preset', () =>
        expect(Object.keys(PRESETS).sort()).toEqual(
            [...RULE_SYSTEM_KEYS].sort()
        ));

    it('uses the preset set when modules are absent, sorted', () =>
        expect(composition({ key: 'combo' }, metas)).toEqual({
            base: 'core',
            modules: ['a', 'b'],
        }));

    it('explicit modules replace the preset set', () => {
        expect(composition({ key: 'combo', modules: ['b'] }, metas)).toEqual({
            base: 'core',
            modules: ['b'],
        });
        expect(
            composition({ key: 'combo', modules: [] }, metas).modules
        ).toEqual([]);
    });

    it('reports unknown key and module ids', () => {
        expect(unknownIds({ key: 'nope' }, metas)).toEqual([
            { code: 'unknownKey', detail: 'nope' },
        ]);
        expect(
            unknownIds({ key: 'plain', modules: ['a', 'zzz', 'core'] }, metas)
        ).toEqual([
            { code: 'unknownModule', module: 'zzz' },
            { code: 'unknownModule', module: 'core' },
        ]);
    });

    it('throws composition() for an unknown key', () =>
        expect(() => composition({ key: 'nope' }, metas)).toThrow(
            'Unknown rule system'
        ));

    it('lists the catalog with i18n keys', () => {
        const catalog = moduleCatalog(metas);

        expect(catalog.bases.map((e) => e.id)).toEqual(['core']);
        expect(catalog.addons.map((e) => [e.id, e.toggle])).toEqual([
            ['a', 'free'],
            ['b', 'setup'],
        ]);
        expect(catalog.addons[0].nameKey).toBe('gameTerms.module.a.name');
        expect(catalog.presets.map((p) => p.key)).toEqual(['plain', 'combo']);
    });
});
