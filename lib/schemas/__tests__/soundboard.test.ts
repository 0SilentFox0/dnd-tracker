import { describe, expect, it } from 'vitest';

import {
    createSoundSchema,
    hiddenBuiltinSchema,
    playSoundSchema,
    reorderSoundsSchema,
    soundUploadRequestSchema,
    updateSoundSchema,
} from '@/lib/schemas/soundboard';

describe('soundboard schemas', () => {
    it('hiddenBuiltin rejects non-builtin and unknown ids', () => {
        expect(
            hiddenBuiltinSchema.safeParse({ ids: ['custom-id'] }).success
        ).toBe(false);
        expect(
            hiddenBuiltinSchema.safeParse({ ids: ['builtin:nope'] }).success
        ).toBe(false);
        expect(
            hiddenBuiltinSchema.safeParse({ ids: ['builtin:bell'] }).success
        ).toBe(true);
    });

    it('update rejects an empty object and accepts a field', () => {
        expect(updateSoundSchema.safeParse({}).success).toBe(false);
        expect(updateSoundSchema.safeParse({ volume: 0.4 }).success).toBe(true);
        expect(updateSoundSchema.safeParse({ volume: 1.4 }).success).toBe(
            false
        );
    });

    it('upload request caps size at 1 MB', () => {
        const base = { name: 'a.mp3', contentType: 'audio/mpeg' };

        expect(
            soundUploadRequestSchema.safeParse({ ...base, size: 1_048_576 })
                .success
        ).toBe(true);
        expect(
            soundUploadRequestSchema.safeParse({ ...base, size: 1_048_577 })
                .success
        ).toBe(false);
    });

    it('create bounds name and duration', () => {
        const ok = { path: 'p', name: 'Boom', durationMs: 10_000 };

        expect(createSoundSchema.safeParse(ok).success).toBe(true);
        expect(
            createSoundSchema.safeParse({ ...ok, durationMs: 10_001 }).success
        ).toBe(false);
        expect(
            createSoundSchema.safeParse({ ...ok, name: 'x'.repeat(61) }).success
        ).toBe(false);
    });

    it('reorder caps ids at 60 and play bounds lengths', () => {
        expect(
            reorderSoundsSchema.safeParse({
                ids: Array.from({ length: 61 }, (_, i) => `${i}`),
            }).success
        ).toBe(false);
        expect(
            playSoundSchema.safeParse({ soundId: 'a', nonce: 'x'.repeat(41) })
                .success
        ).toBe(false);
        expect(
            playSoundSchema.safeParse({ soundId: 'a', nonce: 'n' }).success
        ).toBe(true);
    });
});
