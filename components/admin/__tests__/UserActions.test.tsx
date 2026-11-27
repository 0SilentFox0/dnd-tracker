// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserActions } from '../UserActions';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { AdminUserDetail } from '@/types/admin';

vi.unmock('next-intl');

const m = vi.hoisted(() => {
    const mutation = () => ({
        mutate: vi.fn(),
        reset: vi.fn(),
        isPending: false,
        isError: false,
    });

    return {
        confirm: vi.fn(),
        actions: {
            blockedTemplateIds: [] as string[],
            ban: mutation(),
            unban: mutation(),
            signOut: mutation(),
            remove: mutation(),
        },
    };
});

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/hooks/admin', () => ({
    useAdminUserActions: () => m.actions,
}));
vi.mock('@/lib/hooks/common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/hooks/common')>()),
    useConfirm: () => m.confirm,
}));
vi.mock('@/components/ui/responsive-dialog', () => ({
    ResponsiveDialog: ({
        open,
        children,
        footer,
    }: {
        open: boolean;
        children: React.ReactNode;
        footer: React.ReactNode;
    }) =>
        open ? (
            <div>
                {children}
                {footer}
            </div>
        ) : null,
}));

const user = {
    id: 'u1',
    email: 'Hero@Example.com',
    displayName: 'Hero',
    bannedUntil: null,
} as AdminUserDetail['user'];

const render = (selfId = 'owner', target = user) =>
    renderWithIntl(
        <UserActions user={target} templates={[]} selfId={selfId} />,
        { locale: 'en', namespaces: ['common', 'admin'] }
    );

beforeEach(() => vi.clearAllMocks());

afterEach(cleanup);

describe('UserActions', () => {
    it('keeps the delete confirmation disabled until the email matches', async () => {
        await render();

        fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));

        const confirmButton = () =>
            screen
                .getAllByRole('button', { name: 'Delete account' })
                .at(-1) as HTMLButtonElement;

        expect(confirmButton().disabled).toBe(true);

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'wrong@example.com' },
        });
        expect(confirmButton().disabled).toBe(true);

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'hero@example.com' },
        });
        expect(confirmButton().disabled).toBe(false);
    });

    it('explains the one-hour delay in the ban dialog', async () => {
        await render();

        fireEvent.click(screen.getByRole('button', { name: 'Ban' }));

        expect(screen.getByText(/Takes effect within an hour/)).toBeTruthy();
    });

    it('offers Ban, not Unban, when the ban has expired (bannedUntil null)', async () => {
        await render();

        expect(screen.getByRole('button', { name: 'Ban' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Unban' })).toBeNull();
    });

    it('unbans only after the confirmation is accepted', async () => {
        const banned = {
            ...user,
            bannedUntil: '2030-01-01T00:00:00.000Z',
        } as AdminUserDetail['user'];

        m.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

        await render('owner', banned);

        expect(screen.queryByRole('button', { name: 'Ban' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Unban' }));
        await vi.waitFor(() => expect(m.confirm).toHaveBeenCalledTimes(1));
        expect(m.actions.unban.mutate).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Unban' }));
        await vi.waitFor(() =>
            expect(m.actions.unban.mutate).toHaveBeenCalledTimes(1)
        );
    });

    it('renders no action buttons for the own account', async () => {
        await render('u1');

        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
});
