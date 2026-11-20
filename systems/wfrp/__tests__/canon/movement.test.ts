import { describe, expect } from 'vitest';

import { bookExample } from './book-example';

import '@/lib/server/systems/registry';
import { ParticipantSide } from '@/lib/constants/battle';
import {
    context,
    participant,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { baseMovement } from '@/lib/utils/battle/grid/path';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { slotOf } from '@/systems/wfrp/rules/__tests__/slot-fixtures';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { hasMomentum } from '@/systems/wfrp/rules/combat/momentum';
import { chargeBand, sprintYards } from '@/systems/wfrp/rules/combat/movement';
import { participantChars } from '@/systems/wfrp/rules/combat/participant';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { wfrpState } from '@/systems/wfrp/rules/state';
import { movementMutation } from '@/systems/wfrp/server/battle/movement-mutation';
import type { BattleParticipant } from '@/types/battle';

const rules = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const at = (x: number, y: number) => ({ x, y });

const heroOf = (x = 0, move?: number): BattleParticipant => {
    const base = participant('hero', { controlledBy: 'user-1' });

    return {
        ...base,
        abilities: {
            ...base.abilities,
            system: slotOf({
                ...DEFAULT_CHARACTERISTICS,
                ...(move !== undefined && { move }),
                base: { ...DEFAULT_CHARACTERISTICS.base, ag: 40 },
            }),
        },
        battleData: { ...base.battleData, position: at(x, 0) },
    };
};

const foeOf = (id: string, x: number): BattleParticipant => {
    const base = participant(id, {
        side: ParticipantSide.ENEMY,
        controlledBy: 'dm',
    });

    return { ...base, battleData: { ...base.battleData, position: at(x, 0) } };
};

const ctxOf = (participants: BattleParticipant[]) => {
    const c = context({ participants, rng: () => 0.5 });

    return { ...c, meta: { ...c.meta, rules } };
};

const hero = (out: { participants: BattleParticipant[] }) =>
    out.participants.find((p) => p.basicInfo.id === 'hero')!;

describe('canon: Movement (p163)', () => {
    bookExample(163, 'Run doubles the Walk movement budget', () => {
        const start = heroOf();

        const out = hero(
            movementMutation(ctxOf([start]), {
                kind: 'run',
                participantId: 'hero',
            })
        );

        expect(out.battleData.extraMovement).toBe(baseMovement(start, rules));
        expect(wfrpState(out).moveMode).toBe('run');
    });

    bookExample(163, 'only one of Run, Sprint, Charge per turn', () => {
        const ran = {
            ...heroOf(),
            battleData: {
                ...heroOf().battleData,
                system: hero(
                    movementMutation(ctxOf([heroOf()]), {
                        kind: 'run',
                        participantId: 'hero',
                    })
                ).battleData.system,
            },
        };

        expect(() =>
            movementMutation(ctxOf([ran]), {
                kind: 'run',
                participantId: 'hero',
            })
        ).toThrow();
    });

    bookExample(
        163,
        'Sprint costs the Action and adds Run yards plus SL',
        () => {
            const start = heroOf();

            const out = hero(
                movementMutation(ctxOf([start]), {
                    kind: 'sprint',
                    participantId: 'hero',
                    roll: 10,
                })
            );

            const yards = sprintYards(participantChars(start), 0);

            expect(out.actionFlags.hasUsedAction).toBe(true);
            expect(out.battleData.extraMovement).toBeGreaterThanOrEqual(
                yards * 3
            );
        }
    );

    bookExample(163, 'a failed Sprint still uses the Action, no extra', () => {
        const out = hero(
            movementMutation(ctxOf([heroOf()]), {
                kind: 'sprint',
                participantId: 'hero',
                roll: 99,
            })
        );

        expect(out.actionFlags.hasUsedAction).toBe(true);
        expect(out.battleData.extraMovement ?? 0).toBe(0);
    });

    bookExample(163, 'Charge bands: near, Momentum, beyond Run', () => {
        const c = participantChars(heroOf());

        expect(chargeBand(c, 2)).toBe('near');
        expect(chargeBand(c, 4)).toBe('momentum');
        expect(chargeBand(c, 16)).toBe('momentum');
        expect(chargeBand(c, 17)).toBe('far');
    });

    bookExample(163, 'declaring a Charge grants no Momentum by itself', () => {
        const out = movementMutation(ctxOf([heroOf(), foeOf('f1', 3)]), {
            kind: 'charge',
            participantId: 'hero',
            targetId: 'f1',
        });

        expect(hasMomentum(hero(out))).toBe(false);
        expect(wfrpState(hero(out)).moveMode).toBe('charge');
    });

    bookExample(163, 'cannot Charge while Engaged or beyond Run', () => {
        const charge = (foes: BattleParticipant[]) => () =>
            movementMutation(ctxOf([heroOf(), ...foes]), {
                kind: 'charge',
                participantId: 'hero',
                targetId: 'f1',
            });

        expect(charge([foeOf('f1', 1), foeOf('f2', 0)])).toThrow();
        expect(charge([foeOf('f1', 9)])).toThrow();
    });
});

describe('canon: Charge needs an Action (p163)', () => {
    bookExample(163, 'P4: a used Action rejects Charge', () => {
        const used = heroOf();

        expect(() =>
            movementMutation(
                ctxOf([
                    {
                        ...used,
                        actionFlags: {
                            ...used.actionFlags,
                            hasUsedAction: true,
                        },
                    },
                    foeOf('f1', 3),
                ]),
                { kind: 'charge', participantId: 'hero', targetId: 'f1' }
            )
        ).toThrow('errors.actionUsed');
    });
});
