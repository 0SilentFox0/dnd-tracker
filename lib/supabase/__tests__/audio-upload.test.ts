import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/buckets', () => ({ ensureBucket: vi.fn() }));

import { audioPathOwnedBy } from '../audio-upload';
import { soundPathOwnedBy } from '../soundboard-storage';

const HEX = 'a'.repeat(32);

describe('audio object ownership', () => {
    it('owns a webm path in the sound bucket', () => {
        expect(soundPathOwnedBy(`u1/${HEX}.webm`, 'u1')).toBe(true);
    });

    it('rejects a webm path with default (music) formats', () => {
        expect(audioPathOwnedBy(`u1/${HEX}.webm`, 'u1')).toBe(false);
    });

    it('keeps mp3 for music and rejects another owner', () => {
        expect(audioPathOwnedBy(`c1/${HEX}.mp3`, 'c1')).toBe(true);
        expect(soundPathOwnedBy(`u2/${HEX}.mp3`, 'u1')).toBe(false);
    });
});
