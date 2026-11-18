import { describe, expect, it } from 'vitest';

import {
    participantSnapshotSchema,
    participantStateSchema,
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
