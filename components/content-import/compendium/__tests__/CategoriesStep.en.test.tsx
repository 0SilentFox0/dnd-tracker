// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { CategoriesStep } from '../steps/CategoriesStep';

import type { CompendiumImportController } from '@/lib/hooks/compendium-import';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

vi.unmock('next-intl');
afterEach(cleanup);

const wizard = {
    state: {
        root: {
            _meta: {
                edition: 'classic',
                sources: [{ json: 's', full: 'Synthetic' }],
            },
            spell: [{ name: 'Light', source: 's' }],
            foundry: [{}],
        },
        categories: ['spell'],
        excludedChapters: [],
        options: {},
        busy: false,
    },
    actions: {
        toggleCategory: vi.fn(),
        toggleChapter: vi.fn(),
        changeOptions: vi.fn(),
        runPreview: vi.fn(),
    },
} as unknown as CompendiumImportController;

it('renders English text without raw keys', async () => {
    const { container } = await renderWithIntl(
        <CategoriesStep wizard={wizard} />,
        { locale: 'en', namespaces: ['common', 'validation', 'compendium'] }
    );

    expect(screen.getByLabelText('Spells (1)')).toBeInTheDocument();
    expect(
        screen.getByRole('radio', { name: 'Recommended' })
    ).toBeInTheDocument();
    expect(screen.getByText('Edition: classic 5e')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\bcompendium\./);
});

it('shows the reset notice when a check already exists', async () => {
    const withPreview = {
        ...wizard,
        state: { ...wizard.state, preview: { token: 't' } },
    } as unknown as CompendiumImportController;

    await renderWithIntl(<CategoriesStep wizard={withPreview} />, {
        locale: 'en',
        namespaces: ['common', 'validation', 'compendium'],
    });

    expect(
        screen.getByText('Changing the selection resets the check')
    ).toBeInTheDocument();
});
