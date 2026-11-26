// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    remove: vi.fn(),
    state: { isPending: false, error: null as unknown, isBlocked: false },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, v?: Record<string, string>) =>
        v ? `${key}|${Object.values(v).join(',')}` : key,
}));
vi.mock('@/lib/hooks/account', () => ({
    useDeleteAccount: () => ({ remove: m.remove, ...m.state }),
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

import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection';
import { LEGAL } from '@/lib/constants/site';

const openDialog = () => {
    render(<DeleteAccountSection email="Hero@Example.com" />);
    fireEvent.click(screen.getByText('open'));
};

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    m.state = { isPending: false, error: null, isBlocked: false };
});

describe('DeleteAccountSection', () => {
    it('enables the button only for a matching email, ignoring case', () => {
        openDialog();

        const button = screen.getByText('button') as HTMLButtonElement;

        const input = screen.getByRole('textbox');

        expect(button.disabled).toBe(true);

        fireEvent.change(input, { target: { value: 'hero@example' } });
        expect(button.disabled).toBe(true);

        fireEvent.change(input, { target: { value: 'HERO@example.com' } });
        expect(button.disabled).toBe(false);

        fireEvent.click(button);
        expect(m.remove).toHaveBeenCalledWith('Hero@Example.com');
    });

    it('shows the blocked text with the contact email on 409', () => {
        m.state.error = new Error('x');
        m.state.isBlocked = true;
        openDialog();

        expect(screen.getByRole('alert').textContent).toBe(
            `blocked|${LEGAL.contactEmail}`
        );
    });

    it('shows a generic failure otherwise', () => {
        m.state.error = new Error('x');
        openDialog();

        expect(screen.getByRole('alert').textContent).toBe('failed');
    });
});
