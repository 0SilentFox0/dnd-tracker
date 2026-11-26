// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import { UnitEditForm } from '@/components/units/form/UnitEditForm';

const remove = vi.fn();

const notesState = { has: true };

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/units/form/UnitFormFields', () => ({
    unitFormTabs: () => [
        { id: 'basic', label: 'Basic', content: <input aria-label="name" /> },
    ],
}));

vi.mock('@/lib/hooks/compendium-import', () => ({
    useHasSourceNotes: () => notesState.has,
    useSourceNotes: () => ({
        entries: [
            {
                canonicalKey: 'k',
                originalName: 'Goblin source',
                sourceJson: 'MM',
                edition: '2014',
                notes: 'n',
                issues: [],
            },
        ],
        pager: { page: 1, pages: 1, setPage: vi.fn() },
        isError: false,
    }),
}));

vi.mock('@/lib/hooks/units', () => ({
    useUnitEditForm: () => ({
        form: { data: { name: 'Goblin' }, change: vi.fn() },
        options: {},
        query: {
            data: { abilityIssues: [] },
            isPending: false,
            isError: false,
            error: null,
            refetch: vi.fn(),
        },
        abilities: { valid: true, errors: 0, onValidityChange: vi.fn() },
        actions: { submit: vi.fn(), remove },
        status: { isSaving: false, isDeleting: false, error: null },
        listHref: '/campaigns/c1/dm/units',
    }),
}));

beforeEach(() => {
    mockMatchMedia(false);
    notesState.has = true;
});
afterEach(cleanup);

describe('UnitEditForm layout', () => {
    it('puts delete in the more menu, submit outside the form, notes in the aside', async () => {
        renderWithConfirm(<UnitEditForm campaignId="c1" unitId="u1" />);

        const actions = document.querySelector('.hud-form-actions')!;

        expect(actions).not.toContainElement(
            screen.queryByRole('button', { name: 'common.actions.delete' })
        );

        const submit = actions.querySelector('button[type=submit]')!;

        expect(submit).toHaveAttribute('form', 'unit-form');
        expect(document.querySelector('form')).not.toContainElement(
            submit as HTMLElement
        );

        const aside = document.querySelector('.hud-form-side')!;

        expect(aside).toHaveTextContent('Goblin source');

        fireEvent.pointerDown(
            screen.getByRole('button', { name: 'common.actions.more' }),
            { button: 0, ctrlKey: false }
        );
        fireEvent.click(
            await screen.findByRole('menuitem', {
                name: 'common.actions.delete',
            })
        );
        expect(remove).toHaveBeenCalledTimes(1);
    });

    it('reserves no side column and no preview button without source notes', () => {
        notesState.has = false;
        renderWithConfirm(<UnitEditForm campaignId="c1" unitId="u1" />);

        expect(document.querySelector('.hud-form-side')).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'common.ui.preview' })
        ).toBeNull();
    });
});
