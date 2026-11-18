import { describe, expect, it } from 'vitest';

import { ABILITY_KEYS } from '@/lib/constants/abilities';
import { DND_SKILLS } from '@/lib/constants/skills';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import {
    createMockParticipant,
    grantPassive,
} from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { SheetBlockCtx } from '@/lib/utils/rules/systems/types-sheet';
import { d20SheetBlock } from '@/systems/d20/rules/sheet/block';
import {
    abilityLines,
    armorTotal,
    checkBonus,
} from '@/systems/d20/rules/sheet/lines';
import type { BattleParticipant } from '@/types/battle';
import type { ResolvedClassEntry } from '@/types/classes';

const armorMod = (flat: number) =>
    ({ kind: 'modifyStat', stat: 'armor', flat }) as unknown as StaticEffect;

const strMod = (flat: number) =>
    ({
        kind: 'modifyStat',
        stat: 'strength',
        flat,
    }) as unknown as StaticEffect;

const hero = (
    scores: Partial<Record<(typeof ABILITY_KEYS)[number], number>> = {},
    prof = 2
): BattleParticipant => {
    const base = createMockParticipant();

    return {
        ...base,
        abilities: { ...base.abilities, ...scores, proficiencyBonus: prof },
    };
};

const ctxOf = (
    participant: BattleParticipant,
    over: Partial<SheetBlockCtx> = {}
): SheetBlockCtx => ({
    participant,
    character: {
        strength: 16,
        dexterity: 12,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        savingThrows: {},
        skills: {},
    },
    rules: DEFAULT_RULES,
    ...over,
});

describe('checkBonus', () => {
    it.each([
        [10, false, 2, 0],
        [10, true, 2, 2],
        [8, true, 2, 1],
        [1, false, 2, -5],
        [20, true, 6, 11],
        [16, false, 3, 3],
    ])('score %i proficient=%s prof %i gives %i', (score, pr, prof, out) => {
        expect(checkBonus(score, pr, prof)).toBe(out);
    });
});

describe('armorTotal', () => {
    it('without modifiers the total is the base armor class with one base line', () => {
        const r = armorTotal(hero());

        expect(r.total).toBe(14);
        expect(r.lines).toHaveLength(1);
        expect(r.lines[0]).toMatchObject({ value: '14', source: 'base' });
    });

    it('adds flat modifiers to the total and lists each with a signed value', () => {
        const p = grantPassive(hero(), [armorMod(2)], 'Shield');

        const r = armorTotal(p);

        expect(r.total).toBe(16);
        expect(r.lines).toHaveLength(2);
        expect(r.lines[1].value).toBe('+2');
    });

    it('a negative flat modifier lowers the total and keeps the minus sign', () => {
        const r = armorTotal(grantPassive(hero(), [armorMod(-1)], 'Curse'));

        expect(r.total).toBe(13);
        expect(r.lines[1].value).toBe('-1');
    });

    it('a class-mode hero without armor uses 10 + DEX and two lines', () => {
        const p = hero();

        p.abilities = { ...p.abilities, damageModel: '5e' };

        const r = armorTotal(p);

        expect(r.lines[0]).toMatchObject({ value: '10', source: 'base' });
        expect(r.lines[1]).toMatchObject({ value: '+1', source: 'ability' });
    });
});

describe('abilityLines', () => {
    it('starts with the base score line', () => {
        expect(abilityLines(hero(), 'strength', 15)[0]).toMatchObject({
            value: '15',
            source: 'base',
        });
    });

    it('appends a signed line per baked stat source', () => {
        const p = grantPassive(hero(), [strMod(2)], 'Belt');

        const lines = abilityLines(p, 'strength', 10);

        expect(lines).toHaveLength(2);
        expect(lines[1].value).toBe('+2');
    });

    it('ignores zero-valued sources and other stats', () => {
        const p = grantPassive(hero(), [strMod(0), armorMod(3)], 'Nothing');

        expect(abilityLines(p, 'strength', 10)).toHaveLength(1);
    });
});

describe('d20SheetBlock', () => {
    it('lists all six abilities with 5e modifiers and the primary flag', () => {
        const p = hero({ strength: 18, dexterity: 7 });

        p.abilities = { ...p.abilities, primaryAbility: 'dexterity' };

        const out = d20SheetBlock(ctxOf(p));

        const by = Object.fromEntries(out.abilities!.map((a) => [a.key, a]));

        expect(out.abilities).toHaveLength(6);
        expect(by.strength).toMatchObject({
            score: 18,
            mod: 4,
            isPrimary: false,
        });
        expect(by.dexterity).toMatchObject({
            score: 7,
            mod: -2,
            isPrimary: true,
        });
    });

    it('reports proficiency and total armor class', () => {
        const p = grantPassive(hero({}, 4), [armorMod(1)], 'Ring');

        const out = d20SheetBlock(ctxOf(p));

        expect(out.proficiency).toBe(4);
        expect(out.armorClass?.total).toBe(15);
    });

    it('saves add proficiency from manual flags or from the participant', () => {
        const p = hero({ wisdom: 14, constitution: 12 });

        p.abilities = { ...p.abilities, saveProficiencies: ['constitution'] };

        const out = d20SheetBlock(
            ctxOf(p, {
                character: {
                    ...ctxOf(p).character,
                    savingThrows: { wisdom: true },
                },
            })
        );

        const by = Object.fromEntries(out.saves!.map((s) => [s.key, s]));

        expect(by.wisdom).toMatchObject({ proficient: true, bonus: 4 });
        expect(by.constitution).toMatchObject({ proficient: true, bonus: 3 });
        expect(by.strength).toMatchObject({ proficient: false, bonus: 2 });
    });

    it('covers every skill and uses its governing ability', () => {
        const out = d20SheetBlock(ctxOf(hero({ dexterity: 14 })));

        expect(out.skills!.map((s) => s.key)).toEqual([...DND_SKILLS]);

        const stealth = out.skills!.find((s) => s.key === 'stealth')!;

        expect(stealth).toMatchObject({
            ability: 'dexterity',
            proficient: false,
            bonus: 2,
        });
        expect(stealth.label).toBe('gameTerms.dndSkills.stealth');
    });

    it('proficiency from the manual flag or from choices; expertise doubles it only when proficient', () => {
        const p = hero({ dexterity: 14, wisdom: 12 }, 3);

        const out = d20SheetBlock(
            ctxOf(p, {
                character: {
                    ...ctxOf(p).character,
                    dexterity: 14,
                    skills: { stealth: true },
                },
                choices: {
                    skills: new Set(['perception']),
                    expertise: new Set(['stealth', 'athletics']),
                },
            })
        );

        const by = Object.fromEntries(out.skills!.map((s) => [s.key, s]));

        expect(by.stealth).toMatchObject({
            proficient: true,
            bonus: 2 + 6,
            expertise: true,
        });
        expect(by.perception).toMatchObject({ proficient: true, bonus: 1 + 3 });
        expect(by.perception.expertise).toBeUndefined();
        expect(by.athletics).toMatchObject({ proficient: false });
        expect(by.athletics.expertise).toBeUndefined();
    });

    it('passives are 10 + the skill bonus', () => {
        const p = hero({ wisdom: 14, intelligence: 8 }, 2);

        const out = d20SheetBlock(
            ctxOf(p, {
                choices: {
                    skills: new Set(['perception']),
                    expertise: new Set(['perception']),
                },
            })
        );

        expect(out.passives).toEqual({
            perception: 10 + 2 + 4,
            investigation: 10 - 1,
            insight: 10 + 2,
        });
    });

    it('hit dice label joins resolved class entries and is null without classes', () => {
        const p = hero();

        const classes = [
            { level: 3, class: { hitDie: 8 } },
            { level: 2, class: { hitDie: 6 } },
            { level: 1, class: null },
        ] as unknown as ResolvedClassEntry[];

        expect(d20SheetBlock(ctxOf(p, { classes })).hitDice).toBe('3d8 + 2d6');
        expect(d20SheetBlock(ctxOf(p)).hitDice).toBeNull();
    });

    it('ignores non-record saving throw and skill payloads', () => {
        const p = hero();

        const out = d20SheetBlock(
            ctxOf(p, {
                character: {
                    ...ctxOf(p).character,
                    savingThrows: [true],
                    skills: 'x',
                },
            })
        );

        expect(out.saves!.every((s) => !s.proficient)).toBe(true);
        expect(out.skills!.every((s) => !s.proficient)).toBe(true);
    });
});
