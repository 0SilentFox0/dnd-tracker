// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SpellEditForm } from '@/components/spells/form/forms/SpellEditForm';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';

const mutate = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/spells/form/forms/SpellFormBody', () => ({
    SpellFormBody: ({ submit }: { submit: { id: string } }) => (
        <form id={submit.id} />
    ),
}));

vi.mock('@/components/campaigns/info/detail/SpellReferenceDetail', () => ({
    SpellReferenceDetail: ({ item }: { item: { name: string } }) => (
        <p>preview-{item.name}</p>
    ),
}));

vi.mock('@/components/content-import/shared/SourceNotes', () => ({
    SourceNotes: () => <p>source-notes</p>,
}));

vi.mock('@/lib/hooks/spells', () => ({
    useSpell: () => ({ data: { name: 'Fireball' }, isLoading: false }),
    useSpellGroups: () => ({ data: [] }),
    useUpdateSpell: () => ({ mutate: vi.fn(), isPending: false, error: null }),
    useDeleteSpell: () => ({ mutate, isPending: false, error: null }),
    useSpellFormSync: vi.fn(),
    useSpellIssueText: () => () => '',
}));

beforeEach(() => mockMatchMedia(false));
afterEach(cleanup);

describe('SpellEditForm layout', () => {
    it('renders notes in the aside, submit linked to the form, delete behind the menu', async () => {
        renderWithConfirm(<SpellEditForm campaignId="c1" spellId="s1" />);

        expect(document.querySelector('.hud-form-side')).toHaveTextContent(
            'source-notes'
        );
        expect(document.querySelector('.hud-form-side')).toHaveTextContent(
            'common.ui.previewTitle'
        );
        expect(
            document.querySelector('.hud-form-actions button[type=submit]')
        ).toHaveAttribute('form', 'spell-form');
        expect(
            screen.queryByRole('button', { name: 'common.actions.delete' })
        ).toBeNull();

        fireEvent.pointerDown(
            screen.getByRole('button', { name: 'common.actions.more' }),
            { button: 0, ctrlKey: false }
        );
        fireEvent.click(
            await screen.findByRole('menuitem', {
                name: 'common.actions.delete',
            })
        );
        fireEvent.click(
            await screen.findByRole('button', {
                name: 'common.actions.delete',
            })
        );
        await vi.waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    });
});
