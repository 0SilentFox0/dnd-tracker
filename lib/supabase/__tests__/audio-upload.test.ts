import { describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureBucket } from '@/lib/supabase/buckets';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/supabase/buckets', () => ({ ensureBucket: vi.fn() }));

import { audioPathOwnedBy, createAudioUploadTicket } from '../audio-upload';
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

describe('audio upload ticket errors', () => {
    const bucket = { name: 'b', maxBytes: 1 };

    it('hides the Supabase message when the signed url fails', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.mocked(ensureBucket).mockResolvedValue({ ok: true });
        vi.mocked(createAdminClient).mockReturnValue({
            storage: {
                from: () => ({
                    createSignedUploadUrl: async () => ({
                        data: null,
                        error: { message: 'secret internals' },
                    }),
                }),
            },
        } as never);

        expect(await createAudioUploadTicket(bucket, 'u1', 'mp3')).toEqual({
            ok: false,
            message: API_ERRORS.INTERNAL,
        });
    });

    it('hides the Supabase message when the bucket cannot be ensured', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.mocked(ensureBucket).mockResolvedValue({
            ok: false,
            message: 'secret internals',
        });
        vi.mocked(createAdminClient).mockReturnValue({} as never);

        expect(await createAudioUploadTicket(bucket, 'u1', 'mp3')).toEqual({
            ok: false,
            message: API_ERRORS.INTERNAL,
        });
    });
});
