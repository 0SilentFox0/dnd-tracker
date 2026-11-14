// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/systems/d20/ui/content/classes/ClassForm', () => ({
    ClassForm: ({ gameClass }: { gameClass: { name: string } }) => (
        <p>{`form:${gameClass.name}`}</p>
    ),
}));
vi.mock('@/systems/d20/ui/content/classes/ClassesList', () => ({
    ClassesList: () => <p>classes-list</p>,
}));
vi.mock('@/systems/d20/ui/content/backgrounds/BackgroundForm', () => ({
    BackgroundForm: ({ background }: { background: { name: string } }) => (
        <p>{`bg-form:${background.name}`}</p>
    ),
}));
vi.mock('@/systems/d20/ui/content/backgrounds/BackgroundsList', () => ({
    BackgroundsList: () => <p>bg-list</p>,
}));

import { BackgroundsPage } from '@/systems/d20/ui/content/BackgroundsPage';
import { ClassesPage } from '@/systems/d20/ui/content/ClassesPage';

const base = { campaignId: 'c', canEdit: true };

describe('d20 content pages', () => {
    it('ClassesPage renders the list without a view and the form for edit', () => {
        const list = render(<ClassesPage {...base} />);

        expect(screen.getByText('classes-list')).toBeTruthy();
        list.unmount();

        render(
            <ClassesPage
                {...base}
                view={{ type: 'edit', id: 'k' }}
                data={{ name: 'Bard' }}
            />
        );

        expect(screen.getByText('form:Bard')).toBeTruthy();
    });

    it('BackgroundsPage renders the list or the edit form', () => {
        const list = render(
            <BackgroundsPage {...base} view={{ type: 'list' }} />
        );

        expect(screen.getByText('bg-list')).toBeTruthy();
        list.unmount();

        render(
            <BackgroundsPage
                {...base}
                view={{ type: 'edit', id: 'b' }}
                data={{ name: 'Sage' }}
            />
        );

        expect(screen.getByText('bg-form:Sage')).toBeTruthy();
    });
});
