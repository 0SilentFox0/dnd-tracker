// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AvatarEditor } from '@/components/profile/AvatarEditor';

const avatar = vi.hoisted(() => ({
    upload: vi.fn(),
    remove: vi.fn(),
    pending: false,
}));

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@/lib/hooks/auth', () => ({ useAvatar: () => avatar }));
vi.mock('@/lib/hooks/common', () => ({ useConfirm: () => confirm }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/utils/common/image-url', () => ({
    isHostedOnProjectStorage: (url: string) => url.startsWith('https://sb/'),
}));

const user = (avatarUrl: string | null) => ({
    id: 'u1',
    email: 'a@x.com',
    name: 'Anna',
    avatarUrl,
});

beforeEach(() => {
    avatar.pending = false;
    avatar.upload.mockReset();
    avatar.remove.mockReset();
    confirm.mockReset();
});

afterEach(cleanup);

describe('AvatarEditor', () => {
    it('picks a file through a hidden input and uploads it', () => {
        const { container } = render(<AvatarEditor user={user(null)} />);

        const input = container.querySelector(
            'input[type="file"]'
        ) as HTMLInputElement;

        expect(input.accept).toContain('image/jpeg');
        expect(input.accept).toContain('image/png');
        expect(input.accept).toContain('image/webp');
        expect(input.accept).toContain('image/gif');

        const file = new File(['x'], 'a.png', { type: 'image/png' });

        fireEvent.change(input, { target: { files: [file] } });

        expect(avatar.upload).toHaveBeenCalledWith(file);
    });

    it('hides Remove without a custom avatar', () => {
        render(<AvatarEditor user={user('https://google/a.jpg')} />);

        expect(screen.queryByText('avatar.remove')).toBeNull();
    });

    it('removes only after the confirmation resolves true', async () => {
        confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

        render(<AvatarEditor user={user('https://sb/user-avatars/u1/a.webp')} />);

        fireEvent.click(screen.getByText('avatar.remove'));
        await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
        expect(avatar.remove).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('avatar.remove'));
        await vi.waitFor(() => expect(avatar.remove).toHaveBeenCalledTimes(1));
    });

    it('disables the buttons while pending', () => {
        avatar.pending = true;

        render(<AvatarEditor user={user('https://sb/user-avatars/u1/a.webp')} />);

        expect(
            (screen.getByText('avatar.change') as HTMLButtonElement)
                .disabled
        ).toBe(true);
        expect(
            (screen.getByText('avatar.remove') as HTMLButtonElement)
                .disabled
        ).toBe(true);
    });
});
