import { describe, expect, it } from 'vitest';

import {
    joinableSnapshotSchema,
    participantSnapshotSchema,
    participantStateSchema,
    readJoinableSnapshot,
} from '../snapshot-schema';

describe('participant snapshot/state schemas', () => {
    it('keeps unknown module keys untouched', () => {
        const snapshot = { basicInfo: { id: 'a' }, ext: { wfrp: { fate: 2 } } };

        expect(participantSnapshotSchema.parse(snapshot)).toBe(snapshot);
        expect(
            participantStateSchema.parse({ activeEffects: [], extra: 1 })
        ).toEqual({ activeEffects: [], extra: 1 });
    });

    it.each([null, [], 'x', 3])('rejects non-object %p', (value) => {
        expect(participantSnapshotSchema.safeParse(value).success).toBe(false);
        expect(participantStateSchema.safeParse(value).success).toBe(false);
    });
});

describe('joinable snapshot', () => {
    const base = {
        basicInfo: { name: 'a' },
        abilities: { str: 10, moraleCap: 5 },
        combatStats: { armorClass: 12 },
        spellcasting: {
            spellSlots: { '1': { max: 2, level: 1, extra: true } },
        },
        battleData: { ext: { wfrp: { fate: 2 } } },
        futureSection: { keep: 1 },
    };

    it('parses the real shape and keeps open keys', () => {
        const parsed = joinableSnapshotSchema.parse(base);

        expect(parsed).toEqual(base);
        expect(readJoinableSnapshot(base)).toEqual(base);
    });

    it('defaults missing basicInfo and battleData to empty sections', () => {
        const { basicInfo, battleData, ...legacy } = base;

        expect(readJoinableSnapshot(legacy)).toMatchObject({
            basicInfo: {},
            battleData: {},
        });
    });

    it('rejects a malformed slot but readJoinableSnapshot falls back without throwing', () => {
        const bad = { ...base, spellcasting: { spellSlots: { '1': {} } } };

        expect(joinableSnapshotSchema.safeParse(bad).success).toBe(false);
        expect(readJoinableSnapshot(bad)).toBe(bad);
    });
});
