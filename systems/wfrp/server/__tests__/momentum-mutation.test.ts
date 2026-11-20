import type { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { momentumMutation } from '../battle/momentum-mutation';

import '@/lib/server/systems/registry';
import { AttackType, ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { bookExample } from '@/systems/wfrp/__tests__/canon/book-example';
import { extractWfrpAttacks } from '@/systems/wfrp/rules/combat/extract-attacks';
import { hasMomentum } from '@/systems/wfrp/rules/combat/momentum';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState, withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const rulesOf = (preset: 'canon5e' | 'legacy') =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const weaponRow = (id: string, slot: string) => ({
    slot,
    row: {
        id,
        name: id,
        slot,
        systemStats: {
            type: 'weapon',
            group: 'basic',
            reach: 'average',
            damage: { addSb: true, flat: 4 },
            qualities: [],
            flaws: [],
            twoHanded: false,
            weight: 1,
            price: 1,
        },
    } as unknown as Prisma.ArtifactGetPayload<object>,
});

const attacksOf = (weapons: number, sameHand: boolean) =>
    extractWfrpAttacks({
        rows: Array.from({ length: weapons }, (_, i) =>
            weaponRow(`w${i}`, i > 0 && !sameHand ? 'shield' : 'weapon')
        ),
    }) as unknown as BattleParticipant['battleData']['attacks'];

const heroOf = (opts: {
    weapons?: number;
    sameHand?: boolean;
    usedAction?: boolean;
    momentum?: boolean;
    spent?: boolean;
}): BattleParticipant => {
    const base = participant('hero', { controlledBy: 'user-1' });

    const hero: BattleParticipant = {
        ...base,
        actionFlags: {
            ...base.actionFlags,
            hasUsedAction: opts.usedAction ?? true,
        },
        battleData: {
            ...base.battleData,
            attacks: attacksOf(opts.weapons ?? 2, opts.sameHand ?? false),
        },
    };

    return withWfrpState(hero, {
        momentum: opts.momentum === false ? undefined : true,
        momentumAttack: opts.spent ? true : undefined,
    });
};

const allyOf = () =>
    participant('ally', { controlledBy: 'dm', side: ParticipantSide.ALLY });

const ctxOf = (
    hero: BattleParticipant,
    preset: 'canon5e' | 'legacy' = 'canon5e'
) => {
    const c = context({ participants: [hero, allyOf()] });

    return { ...c, meta: { ...c.meta, rules: rulesOf(preset) } };
};

const find = (out: { participants: BattleParticipant[] }, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id)!;

const second = { mode: 'secondAttack', participantId: 'hero' } as const;

const lead = (roll: number) =>
    ({
        mode: 'leadership',
        participantId: 'hero',
        allyId: 'ally',
        roll,
    }) as const;

describe('canon: second attack with Momentum (p167-168)', () => {
    bookExample(167, 'spends Momentum and grants one attack', () => {
        const out = momentumMutation(ctxOf(heroOf({})), second);

        const hero = find(out, 'hero');

        expect(hasMomentum(hero)).toBe(false);
        expect(wfrpState(hero).momentumAttack).toBe(true);
        expect(hero.battleData.attacksLeft).toBe(1);
    });

    bookExample(167, 'only once per turn', () => {
        expect(() =>
            momentumMutation(ctxOf(heroOf({ spent: true })), second)
        ).toThrow('errors.momentumAttackUsed');
    });

    bookExample(167, 'needs two melee weapons', () => {
        expect(() =>
            momentumMutation(ctxOf(heroOf({ weapons: 1 })), second)
        ).toThrow('errors.secondAttackUnavailable');
    });

    it('needs one weapon per hand', () => {
        expect(() =>
            momentumMutation(ctxOf(heroOf({ sameHand: true })), second)
        ).toThrow('errors.secondAttackUnavailable');
    });

    bookExample(167, 'not before the main action', () => {
        expect(() =>
            momentumMutation(ctxOf(heroOf({ usedAction: false })), second)
        ).toThrow('errors.secondAttackUnavailable');
    });

    bookExample(167, 'needs Momentum', () => {
        expect(() =>
            momentumMutation(ctxOf(heroOf({ momentum: false })), second)
        ).toThrow('errors.momentumNone');
    });

    it('is unsupported under the legacy edition', () => {
        expect(() =>
            momentumMutation(ctxOf(heroOf({}), 'legacy'), second)
        ).toThrow('errors.momentumUnsupported');
    });
});

describe('canon: Leadership hand-off (p169)', () => {
    bookExample(169, 'success passes Momentum to the ally', () => {
        const out = momentumMutation(ctxOf(heroOf({})), lead(10));

        expect(hasMomentum(find(out, 'hero'))).toBe(false);
        expect(hasMomentum(find(out, 'ally'))).toBe(true);
        expect(JSON.stringify(out.events)).toContain(
            'battleWfrp.log.leadershipTransfer'
        );
    });

    bookExample(169, 'failure still loses Momentum', () => {
        const out = momentumMutation(ctxOf(heroOf({})), lead(95));

        expect(hasMomentum(find(out, 'hero'))).toBe(false);
        expect(hasMomentum(find(out, 'ally'))).toBe(false);
        expect(JSON.stringify(out.events)).toContain(
            'battleWfrp.log.leadershipFailed'
        );
    });

    it('rejects an enemy or the hero as the ally', () => {
        const c = ctxOf(heroOf({}));

        expect(() =>
            momentumMutation(c, { ...lead(10), allyId: 'hero' })
        ).toThrow('errors.leadershipAllyInvalid');
    });
});
