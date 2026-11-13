import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
    mergeRules,
    parseRules,
    RulesetPatchSchema,
    RulesetSchema,
} from '../schema';
import { defaultRulesFor } from '../section-registry';

import srdRules from '@/data/templates/srd-5.2/rules.json';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const DEFAULT_RULES = defaultRulesFor({ key: 'homm' });

const SRD_RULES = RulesetSchema.parse(srdRules);

describe('rules.system', () => {
    it('falls back to homm for empty rules', () => {
        expect(parseRules({}).system).toEqual({ key: 'homm' });
    });

    it('legacy rules with classes enabled mean dnd5e', () => {
        expect(parseRules({ classes: { enabled: true } }).system).toEqual({
            key: 'dnd5e',
        });
    });

    it('explicit system wins over classes', () => {
        expect(
            parseRules({ system: { key: 'wfrp' }, classes: { enabled: true } })
                .system
        ).toEqual({ key: 'wfrp' });
    });

    it('invalid system falls back instead of the default', () => {
        expect(
            parseRules({ system: { key: 'x' }, classes: { enabled: true } })
                .system
        ).toEqual({ key: 'dnd5e' });
        expect(parseRules({ system: { key: 'x' } }).system).toEqual({
            key: 'homm',
        });
    });

    it('presets carry their system', () => {
        expect(parseRules(SRD_RULES).system).toEqual({ key: 'dnd5e' });
        expect(parseRules(WFRP_RULES).system).toEqual({ key: 'wfrp' });
        expect(WFRP_RULES.classes.enabled).toBe(false);
        expect(WFRP_RULES.deathSaves.enabled).toBe(false);
        expect(WFRP_RULES.morale.enabled).toBe(false);
    });

    it('unknown key fails with a translatable message key', () => {
        const r = RulesetPatchSchema.safeParse({ system: { key: 'd6pool' } });

        expect(r.success ? [] : r.error.issues.map((i) => i.message)).toEqual([
            'rules.validation.unknownSystem',
        ]);
    });

    it('patch schema accepts valid keys only', () => {
        expect(
            RulesetPatchSchema.safeParse({ system: { key: 'wfrp' } }).success
        ).toBe(true);
        expect(
            RulesetPatchSchema.safeParse({ system: { key: 'x' } }).success
        ).toBe(false);
    });

    it('mergeRules changes only the system section', () => {
        const merged = mergeRules(DEFAULT_RULES, { system: { key: 'wfrp' } });

        expect(merged).toEqual({
            ok: true,
            rules: { ...DEFAULT_RULES, system: { key: 'wfrp' } },
        });
    });
});

describe('rules.system.modules', () => {
    const addon: SystemMeta = {
        module: 't-addon',
        kind: 'addon',
        requires: ['d20'],
        keys: [],
        i18n: {},
    };

    beforeAll(() => (SYSTEM_META as unknown as SystemMeta[]).push(addon));

    afterAll(() => {
        (SYSTEM_META as unknown as SystemMeta[]).splice(
            (SYSTEM_META as unknown as SystemMeta[]).indexOf(addon),
            1
        );
    });

    const withModules = {
        ...DEFAULT_RULES,
        system: { key: 'dnd5e', modules: ['t-addon'] },
    };

    it('parses a row with modules and keeps them sorted', () => {
        expect(
            parseRules({
                system: { key: 'dnd5e', modules: ['t-addon', 't-addon'] },
            }).system
        ).toEqual({ key: 'dnd5e', modules: ['t-addon'] });
    });

    it('modules survive mergeRules of another section', () => {
        const merged = mergeRules(withModules, { morale: { enabled: true } });

        expect(merged.ok && merged.rules.system).toEqual({
            key: 'dnd5e',
            modules: ['t-addon'],
        });
    });

    it('an unknown module id fails with a translatable key', () => {
        const r = RulesetSchema.safeParse({
            ...DEFAULT_RULES,
            system: { key: 'dnd5e', modules: ['nope'] },
        });

        expect(r.success ? [] : r.error.issues.map((i) => i.message)).toEqual([
            'rules.validation.unknownModule',
        ]);
    });

    it('a module of another base fails composition', () => {
        expect(
            RulesetSchema.safeParse({
                ...DEFAULT_RULES,
                system: { key: 'wfrp', modules: ['t-addon'] },
            }).success
        ).toBe(false);
    });

    it('an invalid stored composition falls back to the bare key', () => {
        expect(
            parseRules({ system: { key: 'dnd5e', modules: ['nope'] } }).system
        ).toEqual({ key: 'dnd5e' });
    });

    it('a patch takes well-formed module ids and a confirm flag', () => {
        expect(
            RulesetPatchSchema.safeParse({
                system: { modules: ['morale'] },
                confirm: true,
            }).success
        ).toBe(true);
        expect(
            RulesetPatchSchema.safeParse({ system: { modules: ['Bad id'] } })
                .success
        ).toBe(false);
        expect(RulesetPatchSchema.safeParse({ confirm: false }).success).toBe(
            false
        );
        expect(
            RulesetPatchSchema.safeParse({ system: { key: 'dnd5e' } }).success
        ).toBe(true);
    });
});
