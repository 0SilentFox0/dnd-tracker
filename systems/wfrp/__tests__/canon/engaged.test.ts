import { describe, expect } from 'vitest';

import { bookExample, CANON, LEGACY } from './book-example';

import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import type { ResolveAttackCtx } from '@/lib/utils/rules/systems/types';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import {
    engagedFoes,
    engagementJournal,
    isEngagedPair,
    isSurrounded,
} from '@/systems/wfrp/rules/combat/engagement';
import { resolveWfrpAttack } from '@/systems/wfrp/rules/combat/resolve-attack';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { ATTACK_SLOT } from '@/systems/wfrp/rules/slots';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import { wfrpEngagementAge } from '@/systems/wfrp/rules/turn/engagement-age';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const legacy = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'legacy' },
});

const unit = (
    id: string,
    x: number,
    y: number,
    side: 'ally' | 'enemy'
): BattleParticipant => {
    const p = makeParticipant({ id, side });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                base: { ...DEFAULT_CHARACTERISTICS.base, ws: 45, bs: 45 },
            }),
        },
        battleData: { ...p.battleData, position: { x, y } },
    };
};

const hero = () => unit('hero', 0, 0, ParticipantSide.ALLY);

const foe = (id: string, x: number, y: number) =>
    unit(id, x, y, ParticipantSide.ENEMY);

const sword = (type: AttackType = AttackType.MELEE): BattleAttack =>
    ({
        id: 'w',
        name: 'w',
        type,
        ...(type === AttackType.RANGED && { range: '150 ft' }),
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
        system: ATTACK_SLOT.write({ qualities: [], flaws: [] }),
    }) as unknown as BattleAttack;

const strike = (attack: BattleAttack) => {
    const a = hero();

    const t = foe('t', 1, 0);

    const ctx: ResolveAttackCtx = {
        attacker: a,
        target: t,
        attack,
        participants: [a, t],
        rules: canon,
        rng: () => 0.5,
        manualRoll: 5,
        map: { cols: 100, rows: 5, background: null, opacity: 0.3 },
    };

    return { a, t, r: resolveWfrpAttack(ctx) };
};

const hookCtx = (participants: BattleParticipant[], round: number) => ({
    participants,
    round,
    rng: () => 0.5,
    rules: canon,
});

describe('canon: Engaged follows the attack journal (p163)', () => {
    bookExample(163, 'two adjacent fighters who never attacked are not Engaged', () => {
        const ps = [hero(), foe('f', 1, 0)];

        expect(engagedFoes(ps[0], ps, null, true)).toEqual([]);
        expect(engagedFoes(ps[0], ps, null)).toHaveLength(1);
    });

    bookExample(163, 'a melee attack Engages both fighters', () => {
        const { a, t, r } = strike(sword());

        const a2 = r.attackerUpdate!(a);

        const t2 = r.targetUpdate!(t);

        expect(isEngagedPair(a2, t2)).toBe(true);
        expect(engagedFoes(a2, [a2, t2], null, true)).toHaveLength(1);
        expect(engagedFoes(t2, [a2, t2], null, true)).toHaveLength(1);
    });

    bookExample(163, 'a ranged attack does not Engage', () => {
        const { a, r } = strike(sword(AttackType.RANGED));

        expect(wfrpState(r.attackerUpdate?.(a) ?? a).engagedWith).toBeUndefined();
    });

    bookExample(163, 'a round without attacks between the pair ends the engagement', () => {
        const a = withWfrpState(hero(), { engagedWith: { f: 2 } });

        const f = foe('f', 1, 0);

        const once = wfrpEngagementAge(hookCtx([a, f], 2)).participants;

        expect(engagedFoes(once[0], once, null, true)).toHaveLength(1);

        const twice = wfrpEngagementAge(hookCtx(once, 3)).participants;

        expect(engagedFoes(twice[0], twice, null, true)).toEqual([]);
        expect(wfrpState(twice[0]).engagedWith).toBeUndefined();
    });

    bookExample(163, 'a fresh attack renews the engagement', () => {
        const a = withWfrpState(hero(), { engagedWith: { f: 1 } });

        const renewed = withWfrpState(a, { engagedWith: { f: 2 } });

        const aged = wfrpEngagementAge(hookCtx([renewed, foe('f', 1, 0)], 3));

        expect(wfrpState(aged.participants[0]).engagedWith).toEqual({ f: 1 });
    });

    bookExample(163, 'Surrounded counts only Engaged foes', () => {
        const target = hero();

        const ring = ['a', 'b', 'c'].map((id, i) =>
            foe(id, [1, 0, -1][i], [0, 1, 0][i])
        );

        const linked = ring.map((f) =>
            withWfrpState(f, { engagedWith: { hero: 2 } })
        );

        const unlinked = [...linked.slice(0, 2), ring[2]];

        expect(
            isSurrounded(engagedFoes(target, [target, ...linked], null, true))
        ).toBe(true);
        expect(
            isSurrounded(engagedFoes(target, [target, ...unlinked], null, true))
        ).toBe(false);
    });

    bookExample(163, 'the journal applies only under the canon actions model', () => {
        expect(engagementJournal(canon)).toBe(true);
        expect(engagementJournal(legacy)).toBe(false);
        expect(CANON.actionsModel).toBe('canon');
        expect(LEGACY.actionsModel).toBe('legacy');
    });
});
