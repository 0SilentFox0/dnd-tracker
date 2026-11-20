import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { applyWfrpCrit } from '@/systems/wfrp/rules/combat/crit-effect';
import { rollCrit } from '@/systems/wfrp/rules/combat/crit-table';
import {
    resolveRounds,
    rollRoundsFormula,
} from '@/systems/wfrp/rules/combat/rounds-formula';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { EDITION_PROFILES } from '@/systems/wfrp/rules/edition/profiles';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const pack = JSON.parse(
    readFileSync(
        join(process.cwd(), 'data/templates/grim-d100/rules.json'),
        'utf8'
    )
);

const rules = RulesetSchema.parse({ ...WFRP_RULES, tables: pack.tables });

const tables = rules.tables as unknown as Record<
    string,
    { max: number; effects: { type: string }[] }[]
>;

const ZONES = [
    ['critHead', 'head', 100],
    ['critArm', 'arm', 136],
    ['critBody', 'body', 116],
    ['critLeg', 'leg', 126],
] as const;

const rng = () => 0.15;

describe('canon: Critical Wound tables (p173-176)', () => {
    it.each(ZONES)('%s has 20 rows with ascending ranges ending in death', (slot, _zone, death) => {
        const rows = tables[slot];

        expect(rows).toHaveLength(20);
        expect(rows.every((r, i) => i === 0 || r.max > rows[i - 1].max)).toBe(true);
        expect(rows[19].max).toBe(death);
        expect(rows[19].effects).toEqual([{ type: 'death' }]);
    });

    it.each(ZONES)('%s: the death threshold kills and the roll below does not', (_slot, zone, death) => {
        expect(rollCrit(zone, rules, rng, death).death).toBe(true);
        expect(rollCrit(zone, rules, rng, death + 30).death).toBe(true);
        expect(rollCrit(zone, rules, rng, death - 1).death).toBe(false);
    });

    bookExample(173, 'head: 03 or less leaves a scratch, 04-09 a ringing ear', () => {
        expect(rollCrit('head', rules, rng, 3).bonusDamage).toBe(0);
        expect(rollCrit('head', rules, rng, 3).conditions).toEqual([
            { key: 'bleeding', levels: 1 },
        ]);
        expect(rollCrit('head', rules, rng, 4).conditions).toEqual([
            { key: 'deafened', levels: 1 },
        ]);
    });

    bookExample(174, 'Jarred Arm: 1d10 - TB rounds, at least 1 (TB 3, d10 = 2)', () => {
        const crit = rollCrit('arm', rules, rng, 15, 0, 'left', 3);

        expect(crit.markers).toEqual(['disarmed']);

        const rolled = rollRoundsFormula('1d10-TB', () => 0.15);

        expect(rolled.base).toBe(2);
        expect(resolveRounds(rolled, 3)).toBe(1);
        expect(crit.markerRoundsRolled?.disarmed).toEqual(rolled);
    });

    bookExample(174, 'Wrenched Arm: arm useless for 1d10 rounds, TB does not shorten it', () => {
        const crit = rollCrit('arm', rules, rng, 52, 0, 'right', 5);

        expect(crit.bonusDamage).toBe(2);
        expect(crit.markerRoundsRolled?.disarmed?.tb).toBe(0);
    });

    bookExample(174, 'Dislocated Shoulder: the arm stays useless until reset', () => {
        const crit = rollCrit('arm', rules, rng, 100, 0, 'left', 3);

        expect(crit.markers).toEqual(['disarmed']);
        expect(crit.markerRounds?.disarmed).toBeUndefined();
        expect(crit.markerRoundsRolled?.disarmed).toBeUndefined();
    });

    bookExample(176, 'Twisted Ankle: the leg is hampered for 1d10 - TB rounds', () => {
        const crit = rollCrit('leg', rules, rng, 22, 0, 'left', 3);

        expect(crit.markers).toEqual(['crippled']);
        expect(crit.markerRoundsRolled?.crippled?.tb).toBe(-1);
    });

    bookExample(175, 'body: Winded costs one round of breath', () => {
        const crit = rollCrit('body', rules, rng, 5);

        expect(crit.markers).toEqual(['winded']);
        expect(crit.markerRounds?.winded).toBe(1);
    });

    bookExample(173, 'a crit row applies its Wounds and conditions to the target', () => {
        const target = makeParticipant({ id: 't', hp: 30, maxHp: 30 });

        const crit = rollCrit('head', rules, rng, 70);

        expect(crit.bonusDamage).toBe(4);

        const { participant } = applyWfrpCrit(target, crit, 1, {
            woundModel: EDITION_PROFILES.canon5e.woundModel,
            conditionModel: EDITION_PROFILES.canon5e.conditionModel,
        });

        expect(conditionLevel(participant, 'bleeding')).toBe(2);
    });
});
