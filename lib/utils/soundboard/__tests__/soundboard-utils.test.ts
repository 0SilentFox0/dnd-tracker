import { describe, expect, it, vi } from 'vitest';

import { BUILTIN_SOUNDS } from '@/lib/constants/soundboard';
import { createNonceGuard } from '@/lib/utils/soundboard/dedupe';
import { resolveSound } from '@/lib/utils/soundboard/resolve-sound';
import { validateSoundFile } from '@/lib/utils/soundboard/validate-file';
import { createVoicePool } from '@/lib/utils/soundboard/voices';
import { effectiveVolume } from '@/lib/utils/soundboard/volume';
import type { Sound } from '@/types/soundboard';

const custom: Sound = {
    id: 'c1',
    source: 'custom',
    name: 'Boom',
    url: 'https://x/boom.mp3',
    volume: 0.5,
    color: null,
    icon: null,
    sortOrder: 0,
    durationMs: 900,
};

describe('resolveSound', () => {
    it('resolves a builtin sound', () => {
        const s = resolveSound('builtin:thunder', {
            custom: [],
            hiddenBuiltin: [],
        });

        expect(s).toMatchObject({
            source: 'builtin',
            url: '/sfx/thunder.mp3',
            name: 'soundboard.builtin.thunder',
        });
    });

    it('returns null for hidden or unknown builtin', () => {
        expect(
            resolveSound('builtin:thunder', {
                custom: [],
                hiddenBuiltin: ['builtin:thunder'],
            })
        ).toBeNull();
        expect(
            resolveSound('builtin:nope', { custom: [], hiddenBuiltin: [] })
        ).toBeNull();
    });

    it('resolves a custom sound', () => {
        expect(
            resolveSound('c1', { custom: [custom], hiddenBuiltin: [] })
        ).toBe(custom);
        expect(
            resolveSound('c2', { custom: [custom], hiddenBuiltin: [] })
        ).toBeNull();
    });

    it('registry has 20 unique builtin sounds', () => {
        expect(new Set(BUILTIN_SOUNDS.map((s) => s.id)).size).toBe(20);
    });
});

describe('createNonceGuard', () => {
    it('rejects repeats', () => {
        const seen = createNonceGuard();

        expect(seen('a')).toBe(true);
        expect(seen('a')).toBe(false);
    });

    it('evicts the oldest after size is exceeded', () => {
        const seen = createNonceGuard(50);

        for (let i = 0; i < 51; i++) seen(`n${i}`);

        expect(seen('n0')).toBe(true);
        expect(seen('n50')).toBe(false);
    });
});

describe('effectiveVolume', () => {
    it('is 0 when muted', () => {
        expect(effectiveVolume({ volume: 1 }, { volume: 1, muted: true })).toBe(
            0
        );
    });

    it('multiplies and clamps', () => {
        expect(
            effectiveVolume({ volume: 0.5 }, { volume: 0.5, muted: false })
        ).toBe(0.25);
        expect(
            effectiveVolume({ volume: 2 }, { volume: 2, muted: false })
        ).toBe(1);
    });
});

describe('createVoicePool', () => {
    it('stops only the oldest voice on the 9th add', () => {
        const pool = createVoicePool(8);

        const stops = Array.from({ length: 9 }, () => vi.fn());

        stops.forEach((s) => pool.add(s));

        expect(stops[0]).toHaveBeenCalledTimes(1);
        stops.slice(1).forEach((s) => expect(s).not.toHaveBeenCalled());
    });

    it('removed voices are not stopped later', () => {
        const pool = createVoicePool(1);

        const a = vi.fn();

        const remove = pool.add(a);

        remove();
        pool.add(vi.fn());

        expect(a).not.toHaveBeenCalled();
    });
});

describe('validateSoundFile', () => {
    it('accepts mp3', () => {
        expect(
            validateSoundFile({ name: 'a.mp3', type: 'audio/mpeg', size: 1000 })
        ).toEqual({ ok: true, value: 'mp3' });
    });

    it('rejects files over 1 MB', () => {
        expect(
            validateSoundFile({
                name: 'a.mp3',
                type: 'audio/mpeg',
                size: 2 * 1024 * 1024,
            }).ok
        ).toBe(false);
    });

    it('rejects wav', () => {
        expect(
            validateSoundFile({ name: 'a.wav', type: 'audio/wav', size: 1000 })
                .ok
        ).toBe(false);
    });
});
