import { describe, expect, it } from 'vitest';

import { SYSTEM_UI, systemUiOf } from '../registry';

import { RULE_SYSTEM_REGISTRY } from '@/lib/utils/rules/systems';
import { statColumnsOf } from '@/lib/utils/rules/systems/stats';

describe('system ui registry', () => {
    it('has the three systems, homm and dnd5e share the d20 ui', () => {
        expect(Object.keys(SYSTEM_UI).sort()).toEqual([
            'dnd5e',
            'homm',
            'wfrp',
        ]);

        const {
            rulesSections: hommSections,
            rulesItems: hommItems,
            forms: hommForms,
            sheet: hommSheet,
            ...hommRest
        } = systemUiOf('homm');

        const {
            rulesSections: dndSections,
            rulesItems: dndItems,
            forms: dndForms,
            sheet: dndSheet,
            ...dndRest
        } = systemUiOf('dnd5e');

        expect(hommRest).toEqual(dndRest);
        expect([
            hommForms?.fields?.length,
            hommSheet?.combatRows?.length,
            dndForms,
            dndSheet,
        ]).toEqual([1, 1, undefined, undefined]);
        expect(hommSections).toMatchObject(dndSections ?? {});
        expect(Object.keys(hommSections ?? {})).toEqual(
            expect.arrayContaining(['morale', 'heroScaling'])
        );
        expect(dndItems ?? {}).toEqual({});
        expect(Object.keys(hommItems ?? {})).toEqual(['actions.retaliation']);
        expect(systemUiOf('wfrp')).not.toBe(systemUiOf('homm'));
    });

    it('wfrp hides progression, d20 does not', () => {
        expect(systemUiOf('wfrp').hideProgression).toBe(true);
        expect(systemUiOf('homm').hideProgression).toBe(false);
    });

    it('wfrp has its own magic tab, d20 uses the shared one', () => {
        expect(systemUiOf('wfrp').MagicTab).toBeTypeOf('function');
        expect(systemUiOf('dnd5e').MagicTab).toBeUndefined();
    });

    it('only wfrp has an advancement tab', () => {
        expect(systemUiOf('wfrp').AdvancementTab).toBeTypeOf('function');
        expect(systemUiOf('dnd5e').AdvancementTab).toBeUndefined();
        expect(systemUiOf('homm').AdvancementTab).toBeUndefined();
    });

    it('only wfrp has the downtime tab and the period panel', () => {
        expect(systemUiOf('wfrp').DowntimeTab).toBeDefined();
        expect(systemUiOf('wfrp').DowntimePeriodPanel).toBeDefined();

        for (const key of ['homm', 'dnd5e'] as const) {
            expect(systemUiOf(key).DowntimeTab).toBeUndefined();
            expect(systemUiOf(key).DowntimePeriodPanel).toBeUndefined();
        }
    });

    it('only wfrp has battle slots and the spell magic editor', () => {
        expect(Object.keys(systemUiOf('wfrp').battle ?? {}).sort()).toEqual([
            'CastTest',
            'ChannelDialog',
            'ChannelLabel',
            'ConditionTestPanel',
            'RollBody',
            'RollTitle',
        ]);
        expect(systemUiOf('wfrp').SpellMagicFields).toBeDefined();

        for (const key of ['homm', 'dnd5e'] as const) {
            expect(systemUiOf(key).battle).toBeUndefined();
            expect(systemUiOf(key).SpellMagicFields).toBeUndefined();
        }
    });

    it('sheet flags: d20 keeps spells/items/rest kinds/d20 stats, wfrp keeps only spells', () => {
        for (const key of ['homm', 'dnd5e'] as const) {
            const sys = RULE_SYSTEM_REGISTRY[key];

            expect([
                sys.spells,
                sys.items,
                statColumnsOf(sys).has('armorClass'),
                sys.rest.kinds,
            ]).toEqual([true, true, true, true]);
        }

        const wfrp = RULE_SYSTEM_REGISTRY.wfrp;

        expect([
            wfrp.spells,
            wfrp.items,
            statColumnsOf(wfrp).has('armorClass'),
            wfrp.rest.kinds,
        ]).toEqual([true, false, false, false]);
    });
});

describe('systemUiOf unknown key', () => {
    it('throws instead of returning undefined', () => {
        expect(() => systemUiOf('nope')).toThrow('Unknown rule system: nope');
    });
});
