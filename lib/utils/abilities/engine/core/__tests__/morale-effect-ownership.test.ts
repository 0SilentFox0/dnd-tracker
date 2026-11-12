import { describe, expect, it } from 'vitest';

import {
    makeParticipant,
    resolved,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import { DEFAULT_RULES } from '@/lib/utils/rules';

const owner = () =>
    makeParticipant({
        id: 'a',
        abilities: [
            resolved({
                trigger: { event: 'roundStart' },
                effects: [{ kind: 'changeMorale', delta: 1, target: 'self' }],
            }),
        ],
    });

const moraleAfter = (system: { key: string; modules?: string[] }) =>
    runAbilities(
        [owner()],
        { type: 'roundStart' },
        { rules: { ...DEFAULT_RULES, system }, round: 2, rng: seq(0) }
    ).participants[0].combatStats.morale;

describe('changeMorale belongs to the morale module', () => {
    it('is stored but does nothing in bare dnd5e', () => {
        expect(moraleAfter({ key: 'dnd5e' })).toBe(0);
    });

    it('applies in dnd5e + morale and in the homm preset', () => {
        expect(moraleAfter({ key: 'dnd5e', modules: ['morale'] })).toBe(1);
        expect(moraleAfter({ key: 'homm' })).toBe(1);
    });
});

describe('inactive-module effects never run', () => {
    it('randomOf option with changeMorale does nothing in bare dnd5e', () => {
        const o = makeParticipant({
            id: 'a',
            abilities: [
                resolved({
                    trigger: { event: 'roundStart' },
                    effects: [
                        {
                            kind: 'randomOf',
                            options: [
                                {
                                    kind: 'changeMorale',
                                    delta: 1,
                                    target: 'self',
                                },
                            ],
                        },
                    ],
                }),
            ],
        });

        const run = (system: { key: string; modules?: string[] }) =>
            runAbilities(
                [o],
                { type: 'roundStart' },
                { rules: { ...DEFAULT_RULES, system }, round: 2, rng: seq(0) }
            ).participants[0].combatStats.morale;

        expect(run({ key: 'dnd5e' })).toBe(0);
        expect(run({ key: 'dnd5e', modules: ['morale'] })).toBe(1);
    });

    it('an ability whose effects are all filtered spends no charge, is not fired and logs nothing', () => {
        const o = makeParticipant({
            id: 'a',
            abilities: [
                resolved({
                    trigger: { event: 'roundStart' },
                    limits: { perBattle: 1 },
                    effects: [
                        { kind: 'changeMorale', delta: 1, target: 'self' },
                    ],
                }),
            ],
        });

        const r = runAbilities(
            [o],
            { type: 'roundStart' },
            {
                rules: { ...DEFAULT_RULES, system: { key: 'dnd5e' } },
                round: 2,
                rng: seq(0),
            }
        );

        expect(r.fired).toEqual([]);
        expect(r.participants[0]).toEqual(o);
        expect(r.messages).toEqual([]);
    });
});
