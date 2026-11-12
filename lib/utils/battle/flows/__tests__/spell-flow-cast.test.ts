import { describe, expect, it } from 'vitest';

import {
    initialSpellFlow,
    rollsComplete,
    spellFlow,
    type SpellFlowAction,
    type SpellFlowState,
    spellPayload,
    type SpellPick,
} from '@/lib/utils/battle/flows';

const run = (...a: SpellFlowAction[]) =>
    a.reduce<SpellFlowState>(spellFlow, initialSpellFlow);

const bolt: SpellPick = {
    spellId: 'bolt',
    level: 0,
    targetMode: 'single',
    needsSaves: false,
    castTest: true,
    diceSlots: [],
};

const picked = () =>
    run(
        { type: 'OPEN', casterId: 'me', level: 0 },
        { type: 'PICK', pick: bolt },
        { type: 'TO_TARGETS' },
        { type: 'PICK_TARGET', id: 'gob' }
    );

describe('spell flow with a casting test', () => {
    it('goes through the rolls step and needs the test roll', () => {
        const s = picked();

        expect(s.step).toBe('rolls');
        expect(rollsComplete(s)).toBe(false);
        expect(spellFlow(s, { type: 'TO_SUMMARY' }).step).toBe('rolls');
    });

    it('Auto sends serverRoll', () => {
        const s = spellFlow(picked(), { type: 'SET_CAST_ROLL' });

        expect(rollsComplete(s)).toBe(true);
        expect(spellPayload(s)).toMatchObject({ serverRoll: true });
        expect(spellPayload(s)).not.toHaveProperty('castRoll');
    });

    it('a manual pair sends castRoll', () => {
        const s = spellFlow(picked(), { type: 'SET_CAST_ROLL', roll: 30 });

        expect(spellPayload(s)).toMatchObject({ castRoll: 30 });
        expect(spellPayload(s)).not.toHaveProperty('serverRoll');
    });

    it('a system input is sent as system with the second roll', () => {
        const sys = { key: 'x', data: { kind: 'reroll' } };

        const s = run(
            { type: 'OPEN', casterId: 'me', level: 0 },
            { type: 'PICK', pick: bolt },
            { type: 'TO_TARGETS' },
            { type: 'PICK_TARGET', id: 'gob' },
            { type: 'SET_CAST_SYSTEM', value: sys },
            { type: 'SET_CAST_ROLL', roll: 70, second: 12 }
        );

        expect(rollsComplete(s)).toBe(true);
        expect(spellPayload(s)).toMatchObject({
            castRoll: 70,
            system: sys,
            secondRoll: 12,
        });
    });

    it('changing the system input clears the roll', () => {
        const sys = { key: 'x', data: { kind: 'sl' } };

        const s = spellFlow(
            spellFlow(picked(), { type: 'SET_CAST_ROLL', roll: 30 }),
            { type: 'SET_CAST_SYSTEM', value: sys }
        );

        expect(rollsComplete(s)).toBe(false);
        expect(s.castSystem).toEqual(sys);
    });

    it('a spell without a test keeps the old payload', () => {
        const s = run(
            { type: 'OPEN', casterId: 'me', level: 0 },
            { type: 'PICK', pick: { ...bolt, castTest: undefined } },
            { type: 'TO_TARGETS' },
            { type: 'PICK_TARGET', id: 'gob' }
        );

        expect(spellPayload(s)).not.toHaveProperty('castRoll');
        expect(spellPayload(s)).not.toHaveProperty('serverRoll');
    });
});
