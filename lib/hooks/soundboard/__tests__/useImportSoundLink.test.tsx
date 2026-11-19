// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImportSoundLink } from '../useImportSoundLink';

const api = vi.hoisted(() => ({
    importSoundLink: vi.fn(),
    createLibrarySound: vi.fn(),
    discardSoundObject: vi.fn(),
    decode: vi.fn(),
}));

vi.mock('@/lib/api/sound-library', () => ({
    importSoundLink: api.importSoundLink,
    createLibrarySound: api.createLibrarySound,
    discardSoundObject: api.discardSoundObject,
}));
vi.mock('@/lib/utils/soundboard/decode-duration', () => ({
    decodeDurationMs: api.decode,
}));

const run = async (url = 'https://x.example/a.mp3') => {
    const client = new QueryClient();

    const { result } = renderHook(() => useImportSoundLink(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        ),
    });

    return result.current.mutateAsync(url);
};

describe('useImportSoundLink', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.importSoundLink.mockResolvedValue({
            path: 'u/x.mp3',
            url: 'https://cdn/x.mp3',
        });
        api.discardSoundObject.mockResolvedValue({ ok: true });
        api.createLibrarySound.mockResolvedValue({});
    });

    it('creates a link sound within the limit and keeps the object', async () => {
        api.decode.mockResolvedValue(4200);

        await expect(run()).resolves.toEqual({ rejected: null });
        expect(api.createLibrarySound).toHaveBeenCalledWith({
            path: 'u/x.mp3',
            durationMs: 4200,
            source: 'link',
            sourceUrl: 'https://x.example/a.mp3',
        });
        expect(api.discardSoundObject).not.toHaveBeenCalled();
    });

    it('discards the object for an 11 s sound', async () => {
        api.decode.mockResolvedValue(11_000);

        await expect(run()).resolves.toEqual({ rejected: 'tooLong' });
        expect(api.discardSoundObject).toHaveBeenCalledWith('u/x.mp3');
        expect(api.createLibrarySound).not.toHaveBeenCalled();
    });

    it('discards the object when the duration cannot be decoded', async () => {
        api.decode.mockRejectedValue(new Error('bad'));

        await expect(run()).resolves.toEqual({ rejected: 'invalid' });
        expect(api.discardSoundObject).toHaveBeenCalledWith('u/x.mp3');
    });

    it('discards the object and rethrows when create fails', async () => {
        api.decode.mockResolvedValue(1000);
        api.createLibrarySound.mockRejectedValue(new Error('soundLimit'));

        await expect(run()).rejects.toThrow('soundLimit');
        expect(api.discardSoundObject).toHaveBeenCalledWith('u/x.mp3');
    });

    it('does not discard when the import itself fails', async () => {
        api.importSoundLink.mockRejectedValue(new Error('invalid'));

        await expect(run()).rejects.toThrow('invalid');
        expect(api.discardSoundObject).not.toHaveBeenCalled();
    });
});
