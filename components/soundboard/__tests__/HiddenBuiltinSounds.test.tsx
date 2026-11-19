// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HiddenBuiltinSounds } from '../HiddenBuiltinSounds';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

const mutateOk = vi.fn();

vi.mock('@/lib/hooks/soundboard', () => ({
    useSoundMutations: () => ({ hide: { mutateOk } }),
}));

vi.unmock('next-intl');

const mount = (hiddenBuiltin: string[]) =>
    renderWithIntl(
        <HiddenBuiltinSounds campaignId="c" hiddenBuiltin={hiddenBuiltin} />,
        { locale: 'en', namespaces: ['common', 'soundboard'] }
    );

describe('HiddenBuiltinSounds', () => {
    afterEach(cleanup);

    it('renders nothing when no built-in is hidden', async () => {
        const { container } = await mount([]);

        expect(container.innerHTML).toBe('');
    });

    it('restores one sound without touching the others', async () => {
        await mount(['builtin:bell', 'builtin:coins']);

        expect(screen.getByText('Bell')).toBeTruthy();

        fireEvent.click(screen.getAllByRole('button', { name: 'Show' })[0]);

        expect(mutateOk).toHaveBeenCalledWith(['builtin:bell']);
    });
});
