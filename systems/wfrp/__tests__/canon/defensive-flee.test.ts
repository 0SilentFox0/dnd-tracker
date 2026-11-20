import { describe, expect } from 'vitest';

import { bookExample, CANON } from './book-example';

import '@/lib/server/systems/registry';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { canonDefence } from '@/systems/wfrp/rules/combat/defence';
import { defensiveSl } from '@/systems/wfrp/rules/combat/defensive';
import { hasMomentum } from '@/systems/wfrp/rules/combat/momentum';
import { conditionLevel } from '@/systems/wfrp/rules/conditions/levels';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { wfrpResetState } from '@/systems/wfrp/rules/state-parts';
import { wfrpOnMoveEnd } from '@/systems/wfrp/rules/turn/move-end';
import { defensiveMutation } from '@/systems/wfrp/server/battle/defensive-mutation';
import { fleeMutation } from '@/systems/wfrp/server/battle/flee-mutation';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const rules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const ctxOf = (participants: BattleParticipant[]) => {
    const c = context({ participants, rng: () => 0.5 });

    return { ...c, meta: { ...c.meta, rules } };
};

const find = (out: { participants: BattleParticipant[] }, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id)!;

const heroAt = (): BattleParticipant => {
    const base = participant('hero', { controlledBy: 'user-1' });

    return {
        ...base,
        abilities: { ...base.abilities, system: slotOf() },
        battleData: { ...base.battleData, position: { x: 5, y: 5 } },
    };
};

const foeAt = (id: string, x: number, y: number): BattleParticipant => {
    const base = participant(id, {
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
    });

    return withWfrpState(
        {
            ...base,
            abilities: { ...base.abilities, system: slotOf() },
            battleData: { ...base.battleData, position: { x, y } },
        },
        { engagedWith: { hero: 2 } }
    );
};

const incoming = {
    id: 'sword',
    name: 'sword',
    type: AttackType.MELEE,
    system: ATTACK_SLOT.write({ qualities: [], flaws: [] }),
} as unknown as BattleAttack;

describe('canon: On the Defensive (p162)', () => {
    bookExample(162, 'the Action grants +2 SL to the chosen defence only', () => {
        const out = defensiveMutation(ctxOf([heroAt(), foeAt('f', 6, 5)]), {
            participantId: 'hero',
            skill: 'dodge',
        });

        const hero = find(out, 'hero');

        expect(hero.actionFlags.hasUsedAction).toBe(true);
        expect(defensiveSl(hero)).toEqual({ parry: 0, dodge: 2 });

        const defence = canonDefence(hero, incoming, CANON);

        expect(defence.sl.dodge).toBe(2);
        expect(defence.sl.parry).toBe(0);
    });

    bookExample(162, 'Parry stance lifts the parry only', () => {
        const hero = withWfrpState(heroAt(), { defensive: { skill: 'parry' } });

        expect(canonDefence(hero, incoming, CANON).sl).toEqual({
            parry: 2,
            dodge: 0,
        });
    });

    bookExample(162, 'the stance is lost when the fighter next turn begins', () => {
        const hero = withWfrpState(heroAt(), { defensive: { skill: 'parry' } });

        expect(wfrpState(wfrpResetState(hero, 'turn')).defensive).toBeUndefined();
    });

    bookExample(162, 'taking the stance loses an Aim', () => {
        const aimed = withWfrpState(heroAt(), { aim: { targetId: 'f' } });

        const out = defensiveMutation(ctxOf([aimed, foeAt('f', 6, 5)]), {
            participantId: 'hero',
            skill: 'parry',
        });

        expect(wfrpState(find(out, 'hero')).aim).toBeUndefined();
    });
});

describe('canon: Flee (p163)', () => {
    const surrounded = () => [
        heroAt(),
        foeAt('a', 6, 5),
        foeAt('b', 5, 6),
        foeAt('c', 4, 5),
    ];

    bookExample(163, 'a Surrounded fighter may flee: Broken per foe, foes gain Momentum', () => {
        const out = fleeMutation(ctxOf(surrounded()), { participantId: 'hero' });

        const hero = find(out, 'hero');

        expect(wfrpState(hero).moveMode).toBe('flee');
        expect(conditionLevel(hero, 'broken')).toBe(3);
        expect(['a', 'b', 'c'].every((id) => hasMomentum(find(out, id)))).toBe(true);
    });

    bookExample(163, 'fleeing needs an Engaged foe and an unchosen movement mode', () => {
        const free = [heroAt(), foeAt('a', 9, 9)];

        expect(() => fleeMutation(ctxOf(free), { participantId: 'hero' })).toThrow();

        const running = withWfrpState(heroAt(), { moveMode: 'run' });

        expect(() =>
            fleeMutation(ctxOf([running, foeAt('a', 6, 5)]), {
                participantId: 'hero',
            })
        ).toThrow();
    });

    bookExample(163, 'a fleeing mover walks out of melee without Disengage', () => {
        const fled = withWfrpState(heroAt(), { moveMode: 'flee' });

        const mover = {
            ...fled,
            battleData: {
                ...fled.battleData,
                position: { x: 2, y: 5 },
                movementUsed: 3,
            },
        };

        const run = () =>
            wfrpOnMoveEnd({
                mover,
                start: { x: 5, y: 5 },
                path: [{ x: 2, y: 5 }],
                cost: 3,
                participants: [mover, foeAt('a', 6, 5)],
                round: 1,
                rng: () => 0.5,
                rules,
                map: null,
            });

        expect(run).not.toThrow();

        const chasing = withWfrpState(mover, { moveMode: 'run' });

        expect(() =>
            wfrpOnMoveEnd({
                mover: chasing,
                start: { x: 5, y: 5 },
                path: [{ x: 2, y: 5 }],
                cost: 3,
                participants: [chasing, foeAt('a', 6, 5)],
                round: 1,
                rng: () => 0.5,
                rules,
                map: null,
            })
        ).toThrow();
    });
});
