import { describe, expect, it } from 'vitest';

import { readCharacteristics } from '../../characteristics/keys';
import { CharacteristicsSchema } from '../../characteristics/schema';
import { readDowntime } from '../read';
import { AilmentInputSchema, EndeavourSchema } from '../schema';

const ailment = { id: 'a1', kind: 'disease', daysLeft: 5, label: 'Flu' };

const snapshot = {
    id: 'p1',
    at: '2026-01-01T00:00:00.000Z',
    days: 7,
    before: { hp: 3, ailments: [ailment] },
    after: { hp: 5, ailmentIds: ['a1'] },
    summary: { healed: 2, ailments: [] },
};

const endeavours = [
    { kind: 'earn', params: { skill: 'trade', spec: 'smith' } },
    { kind: 'earn', params: { skill: 'charm' } },
    { kind: 'train', params: { kind: 'characteristic', key: 'ws' } },
    { kind: 'train', params: { kind: 'skill', key: 'trade:smith' } },
    { kind: 'tend', params: { patientId: 'c1' } },
    { kind: 'rest', params: {} },
    { kind: 'custom', params: { text: 'pray' } },
    { kind: 'earn', params: { skill: 'trade', spec: 'Bad Spec' } },
    { kind: 'train', params: { kind: 'characteristic', key: 'zz' } },
    { kind: 'custom', params: { text: 'x'.repeat(201) } },
    { kind: 'rest', params: { a: 1 } },
    { kind: 'tend', params: { patientId: '' } },
    { kind: 'nope', params: {} },
];

describe('readDowntime', () => {
    it.each([undefined, null, 'x', []])('rejects %j', (raw) => {
        expect(readDowntime(raw)).toBeUndefined();
    });

    it('defaults ailments', () => {
        expect(readDowntime({ ailments: [] })).toEqual({ ailments: [] });
        expect(readDowntime({})).toEqual({ ailments: [] });
    });

    it('accepts valid endeavours and rejects invalid ones', () => {
        expect(
            endeavours.map(
                (e) =>
                    readDowntime({ endeavour: e, ailments: [] }) !== undefined
            )
        ).toEqual([
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
        ]);
    });

    it('validates ailments', () => {
        for (const bad of [
            { ...ailment, daysLeft: 0 },
            { ...ailment, daysLeft: 366 },
            { ...ailment, label: '' },
            { ...ailment, label: 'x'.repeat(81) },
        ])
            expect(readDowntime({ ailments: [bad] })).toBeUndefined();

        expect(
            readDowntime({
                ailments: Array.from({ length: 21 }, (_, i) => ({
                    ...ailment,
                    id: `a${i}`,
                })),
            })
        ).toBeUndefined();
        expect(readDowntime({ ailments: [ailment] })).toEqual({
            ailments: [ailment],
        });
    });

    it('validates training', () => {
        expect(
            readDowntime({
                ailments: [],
                training: { kind: 'skill', key: 'charm', discount: 0 },
            })
        ).toBeUndefined();
        expect(
            readDowntime({
                ailments: [],
                training: { kind: 'skill', key: 'charm', discount: 10 },
            })?.training
        ).toEqual({ kind: 'skill', key: 'charm', discount: 10 });
    });

    it('validates lastPeriod', () => {
        const { id: _id, ...noId } = snapshot;

        expect(
            readDowntime({ ailments: [], lastPeriod: noId })
        ).toBeUndefined();
        expect(
            readDowntime({
                ailments: [],
                lastPeriod: { ...snapshot, summary: 'x' },
            })
        ).toBeUndefined();
        expect(
            readDowntime({ ailments: [], lastPeriod: snapshot })?.lastPeriod
        ).toEqual(snapshot);
    });

    it('agrees with the zod schemas', () => {
        for (const e of endeavours)
            expect(EndeavourSchema.safeParse(e).success).toBe(
                readDowntime({ endeavour: e, ailments: [] }) !== undefined
            );

        for (const a of [
            ailment,
            { ...ailment, daysLeft: 0 },
            { ...ailment, label: '' },
            { ...ailment, kind: 'x' },
        ])
            expect(AilmentInputSchema.safeParse(a).success).toBe(
                readDowntime({ ailments: [a] }) !== undefined
            );
    });
});

describe('downtime in characteristics', () => {
    const valid = {
        endeavour: { kind: 'rest', params: {} },
        ailments: [ailment],
    };

    it('readCharacteristics keeps a valid downtime and drops an invalid one', () => {
        expect(
            readCharacteristics({
                characteristics: { fate: 2, downtime: valid },
            }).downtime
        ).toEqual(valid);

        const bad = readCharacteristics({
            characteristics: { fate: 2, downtime: { ailments: 'x' } },
        });

        expect('downtime' in bad).toBe(false);
        expect(bad.fate).toBe(2);
    });

    it('CharacteristicsSchema validates downtime', () => {
        expect(
            CharacteristicsSchema.safeParse({ downtime: { ailments: 'x' } })
                .success
        ).toBe(false);
        expect(
            CharacteristicsSchema.safeParse({ downtime: valid }).success
        ).toBe(true);
    });
});
