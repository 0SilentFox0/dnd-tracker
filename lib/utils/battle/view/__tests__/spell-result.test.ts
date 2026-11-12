import { describe, expect, it } from 'vitest';

import { buildSpellResultFx, castDetailsOf, hpTotals } from '../spell-result';

describe('hpTotals', () => {
    it('сумує зміни по учаснику й відкидає нульові', () => {
        const out = hpTotals([
            { participantId: 'a', participantName: 'Гоблін', change: 4 },
            { participantId: 'a', participantName: 'Гоблін', change: 3 },
            { participantId: 'b', participantName: 'Орк', change: 5 },
            { participantId: 'b', participantName: 'Орк', change: -5 },
        ]);

        expect(out).toEqual([{ name: 'Гоблін', change: 7 }]);
    });
});

describe('buildSpellResultFx', () => {
    it('передає назву й підсумок цілей', () => {
        expect(buildSpellResultFx('Вогняна куля', [], 2)).toEqual({
            kind: 'spell',
            spellName: 'Вогняна куля',
            changes: [],
            targetCount: 2,
        });
    });
});

describe('castDetailsOf', () => {
    const slot = (roll: number) => ({ key: 'wfrp', data: { cast: { roll } } });

    const entry = (
        actionIndex: number,
        actorId: string,
        actionType: string,
        system: object
    ) =>
        ({
            actionIndex,
            actorId,
            actionType,
            actionDetails: { system },
        }) as never;

    it("reads the caster's unseen spell entry", () => {
        const log = [
            entry(1, 'c', 'spell', slot(5)),
            entry(2, 'c', 'spell', slot(7)),
            entry(3, 'x', 'spell', slot(9)),
        ];

        expect(castDetailsOf(log, new Set([1]), 'c')).toEqual(slot(7));
        expect(castDetailsOf(log, new Set([1, 2]), 'c')).toBeUndefined();
    });

    it('P10: ignores an attack entry of the same actor', () => {
        expect(
            castDetailsOf([entry(1, 'c', 'attack', slot(5))], new Set(), 'c')
        ).toBeUndefined();
    });
});
