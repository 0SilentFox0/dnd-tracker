import { describe, expect, it } from 'vitest';

import { disengageMutation } from '../battle/disengage-mutation';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { bookExample } from '@/systems/wfrp/__tests__/canon/book-example';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { hasMomentum } from '@/systems/wfrp/rules/combat/momentum';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const rulesOf = (preset: 'canon5e' | 'legacy') =>
    RulesetSchema.parse({ ...WFRP_RULES, edition: { preset } });

const chars = (over: { ag?: number; ws?: number }) =>
    slotOf({
        ...DEFAULT_CHARACTERISTICS,
        base: { ...DEFAULT_CHARACTERISTICS.base, ...over },
    });

const at = (x: number, y: number) => ({ x, y });

const heroOf = (opts: { momentum?: boolean; usedAction?: boolean } = {}) => {
    const base = participant('hero', { controlledBy: 'user-1' });

    const hero: BattleParticipant = {
        ...base,
        abilities: { ...base.abilities, system: chars({ ag: 40 }) },
        actionFlags: {
            ...base.actionFlags,
            hasUsedAction: opts.usedAction ?? false,
        },
        battleData: { ...base.battleData, position: at(0, 0) },
    };

    return opts.momentum ? withWfrpState(hero, { momentum: true }) : hero;
};

const foeOf = (id: string, x: number, y: number): BattleParticipant => {
    const base = participant(id, {
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
    });

    return {
        ...base,
        abilities: { ...base.abilities, system: chars({ ws: 30 }) },
        battleData: { ...base.battleData, position: at(x, y) },
    };
};

const ctxOf = (
    participants: BattleParticipant[],
    preset: 'canon5e' | 'legacy' = 'canon5e'
) => {
    const c = context({ participants, rng: () => 0.5 });

    return { ...c, meta: { ...c.meta, rules: rulesOf(preset) } };
};

const find = (out: { participants: BattleParticipant[] }, id: string) =>
    out.participants.find((p) => p.basicInfo.id === id)!;

const disengaged = (p: BattleParticipant) =>
    p.battleData.activeEffects.some((e) =>
        e.abilityKey?.startsWith('core:disengage')
    );

const go = (roll: number) => ({ participantId: 'hero', roll });

describe('canon: Disengage (p163)', () => {
    bookExample(163, 'with Momentum it is free and keeps the Action', () => {
        const out = disengageMutation(
            ctxOf([heroOf({ momentum: true }), foeOf('f1', 1, 0)]),
            { participantId: 'hero' }
        );

        const hero = find(out, 'hero');

        expect(hasMomentum(hero)).toBe(false);
        expect(hero.actionFlags.hasUsedAction).toBe(false);
        expect(disengaged(hero)).toBe(true);
        expect(hasMomentum(find(out, 'f1'))).toBe(false);
    });

    bookExample(163, 'without Momentum a won test costs the Action', () => {
        const out = disengageMutation(
            ctxOf([heroOf(), foeOf('f1', 1, 0)]),
            go(20)
        );

        const hero = find(out, 'hero');

        expect(hero.actionFlags.hasUsedAction).toBe(true);
        expect(disengaged(hero)).toBe(true);
        expect(hasMomentum(find(out, 'f1'))).toBe(false);
        expect(JSON.stringify(out.events)).toContain(
            'battleWfrp.log.disengageSuccess'
        );
    });

    bookExample(163, 'a failed test gives the engaged foes Momentum', () => {
        const out = disengageMutation(
            ctxOf([heroOf(), foeOf('f1', 1, 0), foeOf('f2', 0, 1)]),
            go(99)
        );

        const hero = find(out, 'hero');

        expect(disengaged(hero)).toBe(false);
        expect(hero.actionFlags.hasUsedAction).toBe(true);
        expect(hasMomentum(find(out, 'f1'))).toBe(true);
        expect(hasMomentum(find(out, 'f2'))).toBe(true);
    });

    bookExample(163, 'Outnumbered tests with Disadvantage', () => {
        const single = disengageMutation(
            ctxOf([heroOf(), foeOf('f1', 1, 0)]),
            go(38)
        );

        const outnumbered = disengageMutation(
            ctxOf([heroOf(), foeOf('f1', 1, 0), foeOf('f2', 0, 1)]),
            go(38)
        );

        expect(disengaged(find(single, 'hero'))).toBe(true);
        expect(disengaged(find(outnumbered, 'hero'))).toBe(false);
    });

    bookExample(163, 'Surrounded cannot Disengage', () => {
        expect(() =>
            disengageMutation(
                ctxOf([
                    heroOf({ momentum: true }),
                    foeOf('f1', 1, 0),
                    foeOf('f2', 0, 1),
                    foeOf('f3', 1, 1),
                ]),
                go(10)
            )
        ).toThrow('errors.disengageSurrounded');
    });

    bookExample(163, 'only an Engaged character can Disengage', () => {
        expect(() =>
            disengageMutation(ctxOf([heroOf(), foeOf('f1', 5, 5)]), go(10))
        ).toThrow('errors.disengageNotEngaged');
    });

    it('needs the Action without Momentum', () => {
        expect(() =>
            disengageMutation(
                ctxOf([heroOf({ usedAction: true }), foeOf('f1', 1, 0)]),
                go(10)
            )
        ).toThrow('errors.actionUsed');
    });

    it('is unsupported under the legacy edition', () => {
        expect(() =>
            disengageMutation(
                ctxOf([heroOf(), foeOf('f1', 1, 0)], 'legacy'),
                go(10)
            )
        ).toThrow('errors.momentumUnsupported');
    });
});

describe('canon: Disengage ties (p163, higherSl)', () => {
    bookExample(163, 'P2: an equal SL goes to the initiator', () => {
        const out = disengageMutation(
            ctxOf([heroOf(), foeOf('f1', 1, 0)]),
            go(61)
        );

        expect(JSON.stringify(out.events)).toContain(
            'battleWfrp.log.disengageSuccess'
        );
    });
});
