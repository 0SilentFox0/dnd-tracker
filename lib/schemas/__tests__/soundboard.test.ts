import { describe, expect, it } from 'vitest';

import {
    BUILTIN_SOUNDS,
    MAX_SOUND_BYTES,
    SOUND_ICONS,
} from '@/lib/constants/soundboard';
import {
    importLinkSchema,
    playSoundSchema,
    presetSlotsSchema,
    soundUploadRequestSchema,
    updateLibrarySoundSchema,
    updatePresetSchema,
} from '@/lib/schemas/soundboard';

describe('soundboard schemas', () => {
    it('upload request caps size at 1 MB', () => {
        const base = { name: 'a.mp3', contentType: 'audio/mpeg' };

        expect(
            soundUploadRequestSchema.safeParse({ ...base, size: MAX_SOUND_BYTES })
                .success
        ).toBe(true);
        expect(
            soundUploadRequestSchema.safeParse({ ...base, size: 1_048_577 })
                .success
        ).toBe(false);
    });

    it('play bounds lengths', () => {
        expect(
            playSoundSchema.safeParse({ soundId: 'a', nonce: 'x'.repeat(41) })
                .success
        ).toBe(false);
        expect(
            playSoundSchema.safeParse({ soundId: 'a', nonce: 'n' }).success
        ).toBe(true);
    });

    it('presetSlotsSchema requires exactly nine entries', () => {
        expect(presetSlotsSchema.safeParse(Array(8).fill(null)).success).toBe(
            false
        );
        expect(presetSlotsSchema.safeParse(Array(10).fill(null)).success).toBe(
            false
        );
        expect(presetSlotsSchema.safeParse(Array(9).fill(null)).success).toBe(
            true
        );
    });

    it('updatePresetSchema rejects an empty object', () => {
        expect(updatePresetSchema.safeParse({}).success).toBe(false);
        expect(updatePresetSchema.safeParse({ name: 'x' }).success).toBe(true);
    });

    it('importLinkSchema accepts https only and caps length', () => {
        expect(importLinkSchema.safeParse({ url: 'ftp://x' }).success).toBe(
            false
        );
        expect(
            importLinkSchema.safeParse({ url: 'http://example.com/a.mp3' })
                .success
        ).toBe(false);
        expect(
            importLinkSchema.safeParse({
                url: `https://example.com/${'a'.repeat(3000)}`,
            }).success
        ).toBe(false);
        expect(
            importLinkSchema.safeParse({ url: 'https://example.com/a.mp3' })
                .success
        ).toBe(true);
    });

    it('updateLibrarySoundSchema accepts a null name', () => {
        expect(updateLibrarySoundSchema.safeParse({ name: null }).success).toBe(
            true
        );
    });

    it('SOUND_ICONS covers every builtin icon', () => {
        for (const b of BUILTIN_SOUNDS) expect(SOUND_ICONS).toContain(b.icon);
    });
});

describe('sound size cap', () => {
    it('rejects a file too big to be a 10 s clip', () => {
        expect(
            soundUploadRequestSchema.safeParse({
                name: 'a.mp3',
                contentType: 'audio/mpeg',
                size: MAX_SOUND_BYTES + 1,
            }).success
        ).toBe(false);
    });
});
