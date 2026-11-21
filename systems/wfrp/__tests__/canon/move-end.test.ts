import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import { EffectMarker, ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { moveMutation } from '@/lib/server/battles/mutations/move/move-mutation';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { hasMomentum } from '@/systems/wfrp/rules/combat/momentum';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { withWfrpState } from '@/systems/wfrp/rules/state';
import { trait } from '@/systems/wfrp/rules/traits/__tests__/fixtures';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const rules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const map: BattleMapConfig = {
    cols: 30,
    rows: 5,
    background: null,
    opacity: 0.3,
};

const heroAt = (x: number): BattleParticipant => {
    const base = participant('hero', { controlledBy: 'user-1' });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({ ...DEFAULT_CHARACTERISTICS, move: 4 }),
        },
        combatStats: { ...base.combatStats, speed: 120 },
        battleData: {
            ...base.battleData,
            position: { x, y: 0 },
            movementUsed: 0,
        },
    };
};

const foeAt = (x: number): BattleParticipant => {
    const base = participant('f1', {
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
    });

    return withWfrpState(
        { ...base, battleData: { ...base.battleData, position: { x, y: 0 } } },
        { engagedWith: { hero: 2 } }
    );
};

const ctxOf = (participants: BattleParticipant[]) => {
    const c = context({ participants, rng: () => 0.5 });

    return { ...c, meta: { ...c.meta, rules, map } };
};

const heroOf = (out: { participants: BattleParticipant[] }) =>
    out.participants.find((p) => p.basicInfo.id === 'hero')!;

const move = (participants: BattleParticipant[], x: number, y = 0) =>
    moveMutation(ctxOf(participants), {
        participantId: 'hero',
        to: { x, y },
    });

describe('canon: leaving melee needs Disengage (p163)', () => {
    bookExample(163, 'an Engaged fighter cannot walk away', () => {
        expect(() => move([heroAt(5), foeAt(6)], 3)).toThrow(
            'errors.disengageRequired'
        );
    });

    bookExample(357, 'a Swarm ignores the Engaged rules when it moves', () => {
        const hero = heroAt(5);

        const swarm: BattleParticipant = {
            ...hero,
            battleData: {
                ...hero.battleData,
                resolvedAbilities: [
                    trait([{ kind: 'wfrpCreature', trait: 'swarm' }]),
                ],
            },
        };

        expect(heroOf(move([swarm, foeAt(6)], 3)).battleData.position).toEqual({
            x: 3,
            y: 0,
        });
    });

    bookExample(163, 'moving while staying Engaged is allowed', () => {
        const out = move([heroAt(5), foeAt(6)], 5, 1);

        expect(heroOf(out)).toBeDefined();
    });

    bookExample(163, 'a successful Disengage frees the move', () => {
        const free: BattleParticipant = {
            ...heroAt(5),
            battleData: {
                ...heroAt(5).battleData,
                activeEffects: [
                    {
                        id: 'd',
                        name: 'Disengage',
                        type: 'buff',
                        rounds: 1,
                        effects: [{ type: EffectMarker.DISENGAGED, value: 1 }],
                    } as never,
                ],
            },
        };

        const out = move([free, foeAt(6)], 3);

        expect(heroOf(out).battleData.position).toEqual({ x: 3, y: 0 });
    });

    bookExample(163, 'a free fighter walks anywhere', () => {
        const out = move([heroAt(5), foeAt(20)], 8);

        expect(heroOf(out).battleData.position).toEqual({ x: 8, y: 0 });
    });
});

describe('canon: Charge Momentum from the distance moved (p163)', () => {
    const charging = (x: number) =>
        withWfrpState(heroAt(x), { moveMode: 'charge' });

    bookExample(163, 'ending Engaged after Move yards gives Momentum', () => {
        const out = move([charging(0), foeAt(10)], 9);

        expect(hasMomentum(heroOf(out))).toBe(true);
    });

    bookExample(163, 'a short run gives no Momentum', () => {
        const out = move([charging(0), foeAt(2)], 1);

        expect(hasMomentum(heroOf(out))).toBe(false);
    });

    bookExample(163, 'without a Charge a long walk gives none', () => {
        const out = move([heroAt(0), foeAt(10)], 9);

        expect(hasMomentum(heroOf(out))).toBe(false);
    });
});

describe('canon: returning to the start still runs the move-end checks', () => {
    const striker = (x: number): BattleParticipant => {
        const base = heroAt(x);

        return {
            ...base,
            actionFlags: { ...base.actionFlags, hasUsedAction: true },
            battleData: {
                ...base.battleData,
                turnStartPosition: { x: 3, y: 0 },
                resolvedAbilities: [
                    {
                        id: 'sr',
                        name: 'Strike and return',
                        trigger: { event: 'passive' },
                        effects: [{ kind: 'flag', flag: 'strikeAndReturn' }],
                        key: 'unit:t:sr',
                        source: { type: 'unit', id: 't', name: 'x' },
                    },
                ],
            },
        };
    };

    bookExample(163, 'an Engaged fighter cannot slip away by returning', () => {
        expect(() =>
            moveMutation(ctxOf([striker(5), foeAt(6)]), {
                participantId: 'hero',
                to: { x: 3, y: 0 },
                returnToStart: true,
            })
        ).toThrow('errors.disengageRequired');
    });

    bookExample(163, 'a free fighter may return', () => {
        const out = moveMutation(ctxOf([striker(5), foeAt(20)]), {
            participantId: 'hero',
            to: { x: 3, y: 0 },
            returnToStart: true,
        });

        expect(heroOf(out).battleData.position).toEqual({ x: 3, y: 0 });
    });
});
