// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: {
            getSession: () => new Promise(() => {}),
            onAuthStateChange: () => ({
                data: { subscription: { unsubscribe: () => {} } },
            }),
        },
    }),
}));

import { AccountSeedProvider, useSessionUser } from '../useSessionUser';

function Probe() {
    const user = useSessionUser();

    return <span>{user ? user.name : 'none'}</span>;
}

afterEach(cleanup);

describe('useSessionUser', () => {
    it('returns the server seed on the first render', () => {
        render(
            <AccountSeedProvider
                value={{
                    user: { id: '1', email: null, name: 'Ann', avatarUrl: null },
                    hasPassword: true,
                }}
            >
                <Probe />
            </AccountSeedProvider>
        );
        expect(screen.getByText('Ann')).toBeTruthy();
    });

    it('is null without a seed', () => {
        render(<Probe />);
        expect(screen.getByText('none')).toBeTruthy();
    });
});
