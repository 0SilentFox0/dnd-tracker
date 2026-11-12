import { describe, expect, it } from 'vitest';

import { composeUi } from '../compose';
import { systemUiOf } from '../registry';
import type { RulesSectionProps, SystemUi } from '../types';

import { CompositionError } from '@/lib/utils/rules/systems/compose';

const Section = (() => null) as (props: RulesSectionProps) => null;

const base: SystemUi = {
    ...systemUiOf('wfrp'),
    rulesSections: { morale: Section },
};

describe('composeUi', () => {
    it('merges rulesSections of addons and keeps the base ones', () => {
        const Other = (() => null) as typeof Section;

        const out = composeUi(base, [
            { id: 'm', build: () => ({ rulesSections: { saves: Other } }) },
        ]);

        expect(Object.keys(out.rulesSections ?? {}).sort()).toEqual([
            'morale',
            'saves',
        ]);
        expect(out.rulesSections?.morale).toBe(Section);
        expect(out.rulesSections?.saves).toBe(Other);
    });

    it('concatenates forms.fields and sheet.combatRows across addons', () => {
        const A = () => null;

        const B = () => null;

        const out = composeUi({ ...base, forms: { fields: [A] } }, [
            {
                id: 'm',
                build: () => ({
                    forms: { fields: [B] },
                    sheet: { combatRows: [B] },
                }),
            },
        ]);

        expect(out.forms?.fields).toEqual([A, B]);
        expect(out.sheet?.combatRows).toEqual([B]);
    });

    it('concatenates sheet.pathPanels and sheet.itemSections across addons', () => {
        const A = () => null;

        const B = () => null;

        const out = composeUi(
            { ...base, sheet: { pathPanels: [A], itemSections: [A] } },
            [
                {
                    id: 'm',
                    build: () => ({
                        sheet: { pathPanels: [B], itemSections: [B] },
                    }),
                },
            ]
        );

        expect(out.sheet?.pathPanels).toEqual([A, B]);
        expect(out.sheet?.itemSections).toEqual([A, B]);
    });

    it('throws on a duplicate rulesSections key', () => {
        expect(() =>
            composeUi(base, [
                {
                    id: 'm',
                    build: () => ({ rulesSections: { morale: Section } }),
                },
            ])
        ).toThrow(CompositionError);
    });

    it('rejects an unclaimed replacement and hands the claimant prev', () => {
        expect(() =>
            composeUi(base, [
                {
                    id: 'm',
                    build: () => ({ hideProgression: !base.hideProgression }),
                },
            ])
        ).toThrow(/without a claim/);

        const out = composeUi(base, [
            {
                id: 'm',
                claims: ['hideProgression'],
                build: (prev) => ({ hideProgression: !prev.hideProgression }),
            },
        ]);

        expect(out.hideProgression).toBe(!base.hideProgression);
    });

    it('replaces a component slot only through a claim', () => {
        const Wrapped = () => null;

        expect(() =>
            composeUi(base, [
                { id: 'm', build: () => ({ HeroStats: Wrapped }) },
            ])
        ).toThrow(/without a claim/);

        const out = composeUi(base, [
            {
                id: 'm',
                claims: ['HeroStats'],
                build: () => ({ HeroStats: Wrapped }),
            },
        ]);

        expect(out.HeroStats).toBe(Wrapped);
    });
});
