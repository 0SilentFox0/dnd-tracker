import { describe, expect, it } from 'vitest';

import {
    composition,
    moduleCatalog,
    moduleChange,
    moduleToggles,
    PRESETS,
    presetsOf,
    unknownIds,
    withModule,
} from '@/lib/utils/rules/systems/catalog';
import { validateComposition } from '@/lib/utils/rules/systems/compose';
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

const toggleMetas: SystemMeta[] = [
    { module: 'core', kind: 'base', keys: ['plain'], i18n: {} },
    { module: 'other', kind: 'base', keys: ['alt'], i18n: {} },
    { module: 'a', kind: 'addon', keys: [], requires: ['core'], i18n: {} },
    {
        module: 'b',
        kind: 'addon',
        keys: [],
        requires: ['core', 'a'],
        toggle: 'setup',
        i18n: {},
    },
    {
        module: 'c',
        kind: 'addon',
        keys: [],
        requires: ['core'],
        conflicts: ['a'],
        i18n: {},
    },
    { module: 'z', kind: 'addon', keys: [], requires: ['other'], i18n: {} },
];

const byId = (system: { key: string; modules?: string[] }) =>
    Object.fromEntries(
        moduleToggles(system, toggleMetas).map((t) => [t.id, t])
    );

describe('moduleToggles', () => {
    it('lists only addons compatible with the base', () => {
        expect(Object.keys(byId({ key: 'plain' }))).toEqual(['a', 'b', 'c']);
        expect(Object.keys(byId({ key: 'alt' }))).toEqual(['z']);
    });

    it('blocks enabling a module with an inactive requirement', () => {
        expect(byId({ key: 'plain', modules: [] }).b).toMatchObject({
            available: false,
            reason: { code: 'missingRequires', module: 'a' },
            toggle: 'setup',
        });
    });

    it('blocks enabling a module that conflicts with an active one', () => {
        expect(byId({ key: 'plain', modules: ['a'] }).c).toMatchObject({
            available: false,
            reason: { code: 'conflict', module: 'a' },
        });
    });

    it('blocks disabling a module another active module requires', () => {
        expect(byId({ key: 'plain', modules: ['a', 'b'] }).a).toMatchObject({
            active: true,
            available: false,
            reason: { code: 'requiredBy', module: 'b' },
        });
        expect(byId({ key: 'plain', modules: ['a'] }).a.available).toBe(true);
    });
});

describe('withModule', () => {
    it('returns a sorted unique explicit set', () => {
        expect(
            withModule({ key: 'plain', modules: ['b'] }, 'a', true, toggleMetas)
        ).toEqual({ key: 'plain', modules: ['a', 'b'] });
        expect(
            withModule({ key: 'plain', modules: ['a'] }, 'a', true, toggleMetas)
                .modules
        ).toEqual(['a']);
    });

    it('keeps [] when the last module is switched off', () => {
        expect(
            withModule(
                { key: 'plain', modules: ['a'] },
                'a',
                false,
                toggleMetas
            )
        ).toEqual({ key: 'plain', modules: [] });
    });
});

describe('moduleChange', () => {
    it('reports added, removed and setup modules', () => {
        expect(
            moduleChange(
                { key: 'plain', modules: ['a'] },
                { key: 'plain', modules: ['b'] },
                toggleMetas
            )
        ).toEqual({
            changed: true,
            added: ['b'],
            removed: ['a'],
            setup: ['b'],
        });
    });

    it('is not a change for a reordered set', () => {
        expect(
            moduleChange(
                { key: 'plain', modules: ['a', 'c'] },
                { key: 'plain', modules: ['c', 'a'] },
                toggleMetas
            ).changed
        ).toBe(false);
    });
});

describe('composition issues on fixtures', () => {
    it('reports a conflict and a duplicate claim for rival modules', () => {
        const rivals: SystemMeta[] = [
            { module: 'core', kind: 'base', keys: ['plain'], i18n: {} },
            {
                module: 'p',
                kind: 'addon',
                keys: [],
                requires: ['core'],
                conflicts: ['q'],
                claims: ['combat.hitModel.damage'],
                i18n: {},
            },
            {
                module: 'q',
                kind: 'addon',
                keys: [],
                requires: ['core'],
                claims: ['combat.hitModel.damage'],
                i18n: {},
            },
        ];

        const codes = validateComposition(
            { key: 'plain', modules: ['p', 'q'] },
            rivals
        ).map((i) => i.code);

        expect(codes).toEqual(['conflict', 'duplicateClaim']);
    });
});
