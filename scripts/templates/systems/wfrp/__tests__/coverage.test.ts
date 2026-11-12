import { describe, expect, it } from 'vitest';

import type { WfrpData } from '../common';
import { grimCoverage, grimInfo } from '../coverage';
import { fixtureData } from './pack-helpers';

const load = (): WfrpData => structuredClone(fixtureData());

describe('grimCoverage', () => {
    it('reports only the known fixture gaps', () => {
        const warnings = grimCoverage(load()).filter(
            (w) =>
                !w.includes('pool') &&
                !w.includes('no new skill') &&
                !w.startsWith('units') &&
                !w.startsWith('spells') &&
                !w.startsWith('artifacts')
        );

        expect(warnings).toHaveLength(4);
        expect(warnings).toEqual(
            expect.arrayContaining([
                'characteristic "i": no career advances it',
                'characteristic "dex": no career advances it',
                'careers "Vermin Hunter": tier 1 lists 4 items, ticksRequired[0] is 10',
                'careers "Watchman": tier 1 lists 3 items, ticksRequired[0] is 10',
            ])
        );
    });

    it('reports magic and equipment gaps of the fixture', () => {
        const warnings = grimCoverage(load());

        expect(warnings).toEqual(
            expect.arrayContaining([
                'spells: kind "arcane" has no spell',
                'spells: list "School of Gloam" has no spell',
                'artifacts: weapon group "bow" has no item',
                'artifacts: armour kind "plate" has no item',
                'artifacts: slot "shield" has no item',
                'artifacts: quality "blast" has no carrier',
                'artifacts: flaw "reload" has no carrier',
                'units: theme "Cultists" has no caster',
            ])
        );
        expect(warnings).not.toContain('spells: kind "petty" has no spell');
    });

    it('says nothing about magic or equipment when those files are empty', () => {
        const data = load();

        data.spells = [];
        data.artifacts = [];

        const warnings = grimCoverage(data);

        expect(
            warnings.filter(
                (w) => w.startsWith('spells') || w.startsWith('artifacts')
            )
        ).toEqual([]);
        expect(warnings.some((w) => w.includes('has no caster'))).toBe(false);
    });

    it('lists spells no unit knows', () => {
        const data = load();

        expect(grimInfo(data)).toEqual([]);
        data.units[0].knownSpells = [];
        expect(grimInfo(data)).toEqual([
            'info: spells "Rot Touch": known by no unit',
        ]);
    });

    const rat = () => structuredClone(load().units[0]);

    const ab = (id: string, name: string, effect: object) => ({
        id,
        name,
        trigger: { event: 'passive' },
        effects: [effect],
    });

    it('reports bestiary gaps of the one-unit fixture', () => {
        const warnings = grimCoverage(load());

        expect(warnings).toEqual(
            expect.arrayContaining([
                'units: theme "Raiders" has no unit',
                'units: level 4 has no unit',
                'units: trait "ward" is used by no unit',
                'units: trait "terror" is used by no unit',
                'units: trait "magical" is used by no unit',
                'units: trait "ranged" is used by no unit',
            ])
        );
        expect(warnings).not.toContain(
            'units: trait "bite" is used by no unit'
        );
    });

    it('says nothing about units when there are none', () => {
        const data = load();

        data.units = [];
        expect(grimCoverage(data).filter((w) => w.startsWith('units'))).toEqual(
            []
        );
    });

    it('flags a unit without an attack, Terror below Elite and a plain Boss', () => {
        const data = load();

        data.units[0].abilities = [
            ab('size', 'Size (Small)', { kind: 'wfrpSize', size: 'small' }),
        ];
        data.units.push({
            ...rat(),
            name: 'Rat Brute',
            level: 2,
            abilities: [
                ...(rat().abilities as object[]),
                ab('fear', 'Terror 1', {
                    kind: 'wfrpPsychology',
                    psychology: 'terror',
                    value: 1,
                }),
            ],
        });
        data.units.push({ ...rat(), name: 'Rat King', level: 4 });

        const warnings = grimCoverage(data);

        expect(warnings).toContain('units "Giant Rat": no attack');
        expect(warnings).toContain('units "Rat Brute": Terror below Elite');
        expect(warnings).toContain(
            'units "Rat King": Boss without Magical or Breath'
        );
    });

    it('a magical Boss is fine', () => {
        const data = load();

        data.units.push({
            ...rat(),
            name: 'Rat King',
            level: 4,
            abilities: [
                ab('bite', 'Bite +6', {
                    kind: 'wfrpAttack',
                    attack: 'bite',
                    damage: 6,
                    magical: true,
                }),
            ],
        });
        expect(grimCoverage(data)).not.toContain(
            'units "Rat King": Boss without Magical or Breath'
        );
    });

    it('flags Wounds that do not rise and Armour that drops within a theme', () => {
        const data = load();

        data.units[0].abilities = [
            ...(rat().abilities as object[]),
            ab('armour', 'Armour 1', {
                kind: 'wfrpArmour',
                head: 1,
                body: 1,
                arm: 1,
                leg: 1,
            }),
        ];
        data.units.push({ ...rat(), name: 'Rat Pup', level: 2, maxHp: 4 });

        const warnings = grimCoverage(data);

        expect(warnings).toContain(
            'units: theme "Beasts" Wounds do not rise with level'
        );
        expect(warnings).toContain(
            'units: theme "Beasts" Armour drops with level'
        );
    });

    it('flags an unused feat', () => {
        const data = load();

        data.feats.push({
            name: 'Spare',
            type: 'general',
            description: 'x',
            xpCost: 100,
            maxRank: 1,
        });
        expect(grimCoverage(data)).toContain('feats "Spare": unused');
    });

    it('flags a career outside every careerTable', () => {
        const data = load();

        data.careers.push({ ...data.careers[1], name: 'Lone Wolf' });
        expect(grimCoverage(data)).toContain(
            'careers "Lone Wolf": not in any species careerTable'
        );
    });

    it('flags statuses that do not rise', () => {
        const data = load();

        ['Silver 1', 'Brass 2', 'Gold 1', 'Gold 2'].forEach((status, i) => {
            data.careers[0][`tier${i + 1}_status`] = status;
        });
        expect(grimCoverage(data)).toContain(
            'careers "Vermin Hunter": tier statuses do not rise'
        );
    });

    it('flags a randomTalentCount above the distinct table talents', () => {
        const data = load();

        data.raceProfiles[0].profile.randomTalentCount = 3;
        expect(grimCoverage(data).some((w) => w.includes('exceeds'))).toBe(
            true
        );
    });

    it('flags a skill outside the class pool and a tier that adds no new skill', () => {
        const data = load();

        data.careers[0].class = 'Warrior';
        data.careers[0].tier1_skills = [
            'melee:basic',
            'melee:parry',
            'dodge',
            'cool',
            'endurance',
        ];
        data.careers[0].tier2_skills = ['sailing', 'intimidate', 'athletics'];
        data.careers[0].tier3_skills = ['melee:basic', 'dodge', 'cool'];

        const warnings = grimCoverage(data);

        expect(warnings).toContain(
            'careers "Vermin Hunter": tier 2 skill "sailing" is outside the Warrior pool'
        );
        expect(warnings).toContain(
            'careers "Vermin Hunter": tier 3 adds no new skill'
        );
    });
});
