// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    notify: vi.fn(),
    avatarTicket: vi.fn(),
    commitAvatar: vi.fn(),
    removeAvatar: vi.fn(),
    uploadToSignedUrl: vi.fn(),
    refreshSession: vi.fn(),
    crop: vi.fn(),
}));

vi.mock('@/lib/hooks/common', () => ({ useNotify: () => m.notify }));
vi.mock('@/lib/i18n/use-translator', () => ({
    useTranslator: () => (key: string) => key,
}));
vi.mock('@/lib/api/profile', () => ({
    profileApi: {
        avatarTicket: m.avatarTicket,
        commitAvatar: m.commitAvatar,
        removeAvatar: m.removeAvatar,
    },
}));
vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        storage: { from: () => ({ uploadToSignedUrl: m.uploadToSignedUrl }) },
        auth: { refreshSession: m.refreshSession },
    }),
}));
vi.mock('@/lib/utils/common/image-resize', () => ({
    cropSquareToBlob: m.crop,
}));

import { useAvatar } from '@/lib/hooks/auth/useAvatar';

const file = (type: string, size = 10) => {
    const f = new File(['x'], 'a', { type });

    Object.defineProperty(f, 'size', { value: size });

    return f;
};

const blob = new Blob(['b'], { type: 'image/webp' });

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m.avatarTicket.mockResolvedValue({
        bucket: 'user-avatars',
        path: 'u/1.webp',
        token: 'tok',
        contentType: 'image/webp',
        publicUrl: 'https://x/1.webp',
    });
    m.commitAvatar.mockResolvedValue({ avatarUrl: 'https://x/1.webp' });
    m.removeAvatar.mockResolvedValue({ ok: true });
    m.uploadToSignedUrl.mockResolvedValue({ error: null });
    m.refreshSession.mockResolvedValue({});
    m.crop.mockResolvedValue(blob);
});

describe('useAvatar', () => {
    it('rejects a non-image without calling the API', async () => {
        const { result } = renderHook(() => useAvatar());

        await act(() => result.current.upload(file('application/pdf')));

        expect(m.notify).toHaveBeenCalledWith('profile.avatar.badType');
        expect(m.avatarTicket).not.toHaveBeenCalled();
    });

    it('rejects a file over 15 MB', async () => {
        const { result } = renderHook(() => useAvatar());

        await act(() =>
            result.current.upload(file('image/png', 15 * 1024 * 1024 + 1))
        );

        expect(m.notify).toHaveBeenCalledWith('profile.avatar.tooLarge');
        expect(m.avatarTicket).not.toHaveBeenCalled();
    });

    it('uploads in order: ticket, storage, commit, refresh', async () => {
        const { result } = renderHook(() => useAvatar());

        await act(() => result.current.upload(file('image/png')));

        expect(m.uploadToSignedUrl).toHaveBeenCalledWith(
            'u/1.webp',
            'tok',
            blob,
            { contentType: 'image/webp', cacheControl: '31536000' }
        );
        expect(m.commitAvatar).toHaveBeenCalledWith('https://x/1.webp');
        expect(m.refreshSession).toHaveBeenCalled();

        const order = (f: ReturnType<typeof vi.fn>) =>
            f.mock.invocationCallOrder[0];

        expect(order(m.avatarTicket)).toBeLessThan(order(m.uploadToSignedUrl));
        expect(order(m.uploadToSignedUrl)).toBeLessThan(order(m.commitAvatar));
        expect(order(m.commitAvatar)).toBeLessThan(order(m.refreshSession));
    });

    it('notifies and skips commit when the storage upload fails', async () => {
        m.uploadToSignedUrl.mockResolvedValue({ error: new Error('boom') });

        const { result } = renderHook(() => useAvatar());

        await act(() => result.current.upload(file('image/png')));

        expect(m.notify).toHaveBeenCalledWith('profile.avatar.failed');
        expect(m.commitAvatar).not.toHaveBeenCalled();
        expect(result.current.pending).toBe(false);
    });

    it('is pending during the run and ignores a second call', async () => {
        let release!: (v: unknown) => void;

        m.avatarTicket.mockReturnValue(
            new Promise((r) => {
                release = r;
            })
        );

        const { result } = renderHook(() => useAvatar());

        let first!: Promise<void>;

        act(() => {
            first = result.current.upload(file('image/png'));
        });

        expect(result.current.pending).toBe(true);

        await act(() => result.current.upload(file('image/png')));

        expect(m.avatarTicket).toHaveBeenCalledTimes(1);

        release({
            bucket: 'b',
            path: 'p',
            token: 't',
            contentType: 'image/webp',
            publicUrl: 'https://x/p',
        });

        await act(() => first);

        expect(result.current.pending).toBe(false);
    });

    it('remove calls the API then refreshes the session', async () => {
        const { result } = renderHook(() => useAvatar());

        await act(() => result.current.remove());

        expect(m.removeAvatar).toHaveBeenCalled();
        expect(m.refreshSession).toHaveBeenCalled();
        expect(m.removeAvatar.mock.invocationCallOrder[0]).toBeLessThan(
            m.refreshSession.mock.invocationCallOrder[0]
        );
    });
});
