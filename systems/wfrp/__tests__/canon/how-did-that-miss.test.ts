import { describe, expect, it } from 'vitest';

import { bookExample } from './book-example';

import { AttackType } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import type { CritPicker } from '@/lib/utils/battle/crit-choice/types';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const legacy = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

const fighter = (id: string, fate?: number): BattleParticipant => {
    const base = makeParticipant({ id, hp: 20, maxHp: 20 });

    const p = {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ws: 40, bs: 40 },
                fate: fate ?? 0,
            }),
        },
    };

    return p;
};

const sword = {
    id: 'sw',
    name: 'Sword',
    type: AttackType.MELEE,
} as unknown as BattleAttack;

const bow = {
    id: 'bw',
    name: 'Bow',
    type: AttackType.RANGED,
} as unknown as BattleAttack;

const run = (
    attack: BattleAttack,
    opts: {
        rules?: typeof canon;
        fate?: number;
        crit?: CritPicker;
    } = {}
) => {
    const attacker = fighter('a');

    const target = fighter('t', opts.fate ?? 2);

    return {
        target,
        r: resolveWfrpAttack({
            attacker,
            target,
            attack,
            participants: [attacker, target],
            rules: opts.rules ?? canon,
            rng: () => 0.5,
            manualRoll: 5,
            crit: opts.crit,
        }),
    };
};

const negating = (answer: boolean) => {
    const offers: unknown[] = [];

    const crit = Object.assign(() => undefined, {
        negate: (info: unknown) => {
            offers.push(info);

            return answer;
        },
    }) as CritPicker;

    return { crit, offers };
};

describe('canon: How Did That Miss? (p133)', () => {
    bookExample(
        133,
        'a hit with Fate left offers the cancellation once',
        () => {
            const { crit, offers } = negating(false);

            const { r } = run(sword, { crit });

            expect(r.isHit).toBe(true);
            expect(offers).toHaveLength(1);
            expect(offers[0]).toMatchObject({
                cost: 'battleWfrp.ui.fateReaction.spend',
            });
        }
    );

    bookExample(133, 'declining leaves the attack as it was', () => {
        const base = run(sword);

        const { r, target } = run(sword, { crit: negating(false).crit });

        expect(r.isHit).toBe(base.r.isHit);
        expect(r.targetUpdate?.(target)).toEqual(base.r.targetUpdate?.(target));
    });

    bookExample(
        133,
        'spending Fate cancels the hit with all consequences, melee',
        () => {
            const { r, target } = run(sword, { crit: negating(true).crit });

            expect(r.isHit).toBe(false);
            expect(r.attackRoll.isHit).toBe(false);
            expect(r.scene).toBeUndefined();
            expect(r.attackerUpdate).toBeUndefined();
            expect(JSON.stringify(r.lines)).toContain(
                'battleWfrp.log.fateHowDidThatMiss'
            );
            expect(wfrpState(r.targetUpdate!(target)).fate).toBe(1);
            expect(JSON.stringify(r.attackRoll.system)).toContain('negated');
        }
    );

    bookExample(133, 'spending Fate cancels a ranged hit', () => {
        const { r, target } = run(bow, { crit: negating(true).crit });

        expect(r.isHit).toBe(false);
        expect(wfrpState(r.targetUpdate!(target)).fate).toBe(1);
    });

    it('a target without Fate gets no offer', () => {
        const { crit, offers } = negating(true);

        const { r } = run(sword, {
            crit,
            fate: 0,
        });

        expect(offers).toHaveLength(0);
        expect(r.isHit).toBe(true);
    });

    it('the legacy edition never offers it', () => {
        const { crit, offers } = negating(true);

        const { r } = run(sword, { crit, rules: legacy });

        expect(offers).toHaveLength(0);
        expect(r.isHit).toBe(true);
    });

    it('a miss gets no offer', () => {
        const { crit, offers } = negating(true);

        const attacker = fighter('a');

        const target = fighter('t', 2);

        const r = resolveWfrpAttack({
            attacker,
            target,
            attack: sword,
            participants: [attacker, target],
            rules: canon,
            rng: () => 0.5,
            manualRoll: 95,
            crit,
        });

        expect(r.isHit).toBe(false);
        expect(offers).toHaveLength(0);
    });

    it('spent Fate stored as 0 means no offer', () => {
        const target = withWfrpState(fighter('t', 2), { fate: 0 });

        const { crit, offers } = negating(true);

        const attacker = fighter('a');

        resolveWfrpAttack({
            attacker,
            target,
            attack: sword,
            participants: [attacker, target],
            rules: canon,
            rng: () => 0.5,
            manualRoll: 5,
            crit,
        });

        expect(offers).toHaveLength(0);
    });
});
