import { describe, expect, it } from 'vitest';

import { wfrpAbilitiesOf } from '../../combat/participant';
import { wfrpAttackTarget } from '../../combat/resolve-attack';
import { EDITION_PROFILES } from '../../edition';
import { applyWfrpConditionTo } from '../apply';
import type { WfrpConditionKey } from '../catalog';
import { againstMod, selfTestMod } from '../test-mod';

import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const src = textRef('battleWfrp.log.removed', { target: 'x', condition: 'y' });

const withConds = (
    ...conds: Array<[WfrpConditionKey, number?]>
): BattleParticipant =>
    conds.reduce(
        (p, [key, levels]) =>
            applyWfrpConditionTo(p, { key, levels, round: 1, sourceName: src })
                .participant,
        makeParticipant({ id: 'a' })
    );

describe('selfTestMod', () => {
    it('sums leveled penalties', () => {
        expect(selfTestMod(withConds(['fatigued', 2]), 'attack', EDITION_PROFILES.legacy)).toBe(-20);
        expect(selfTestMod(withConds(['fatigued', 2]), 'test', EDITION_PROFILES.legacy)).toBe(-20);
        expect(
            selfTestMod(withConds(['fatigued', 1], ['poisoned', 2]), 'test', EDITION_PROFILES.legacy)
        ).toBe(-30);
    });

    it('blinded penalizes attacks only', () => {
        expect(selfTestMod(withConds(['blinded']), 'attack', EDITION_PROFILES.legacy)).toBe(-20);
        expect(selfTestMod(withConds(['blinded']), 'test', EDITION_PROFILES.legacy)).toBe(0);
        expect(
            selfTestMod(withConds(['stunned', 1], ['blinded']), 'attack', EDITION_PROFILES.legacy)
        ).toBe(-30);
    });

    it('empty participant is 0', () => {
        expect(selfTestMod({} as never, 'attack', EDITION_PROFILES.legacy)).toBe(0);
        expect(selfTestMod(undefined, 'test', EDITION_PROFILES.legacy)).toBe(0);
    });
});

describe('againstMod', () => {
    it('prone helps melee only', () => {
        expect(againstMod(withConds(['prone']), 'melee', EDITION_PROFILES.legacy)).toBe(20);
        expect(againstMod(withConds(['prone']), 'ranged', EDITION_PROFILES.legacy)).toBe(0);
    });

    it('surprised helps all, stacks with others', () => {
        expect(againstMod(withConds(['surprised']), 'melee', EDITION_PROFILES.legacy)).toBe(20);
        expect(againstMod(withConds(['surprised']), 'ranged', EDITION_PROFILES.legacy)).toBe(20);
        expect(againstMod(withConds(['blinded'], ['prone']), 'melee', EDITION_PROFILES.legacy)).toBe(40);
    });
});

describe('wfrpAttackTarget', () => {
    it('shows the condition penalty', () => {
        const characteristics = {
            ...DEFAULT_CHARACTERISTICS,
            base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40 },
        };

        const base = withConds();

        const attacker = (p: BattleParticipant) => ({
            ...p,
            abilities: {
                ...p.abilities,
                ...wfrpAbilitiesOf(characteristics, {
                    ap: { head: 0, arm: 0, body: 0, leg: 0 },
                }),
            },
        });

        const sword: BattleAttack = {
            id: 'sw',
            name: 'Sword',
            type: AttackType.MELEE,
            attackBonus: 0,
            damageDice: '1d6',
            damageType: 'slashing',
        };

        expect(
            wfrpAttackTarget(attacker(withConds(['fatigued', 1])), sword).target
        ).toBe(wfrpAttackTarget(attacker(base), sword).target - 10);
    });
});
