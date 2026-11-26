// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/systems/artifactsets/ui/content/ArtifactSetsList', () => ({
    ArtifactSetsList: () => <p>sets-list</p>,
}));
vi.mock('@/systems/artifactsets/ui/content/ArtifactSetForm', () => ({
    ArtifactSetForm: ({
        setId,
        initial,
    }: {
        setId?: string;
        initial?: { name?: string };
    }) => <p>{`form:${setId ?? 'new'}:${initial?.name ?? ''}`}</p>,
}));

import { ARTIFACTSETS_META } from '@/systems/artifactsets/meta';
import { ARTIFACTSETS_MODULE_UI } from '@/systems/artifactsets/ui';
import { ArtifactSetsPage } from '@/systems/artifactsets/ui/content/ArtifactSetsPage';

const base = { campaignId: 'c', canEdit: true };

describe('artifactsets content page', () => {
    it('dispatches list, new and edit', () => {
        const list = render(<ArtifactSetsPage {...base} />);

        expect(screen.getByText('sets-list')).toBeTruthy();
        list.unmount();

        const created = render(
            <ArtifactSetsPage {...base} view={{ type: 'new' }} />
        );

        expect(screen.getByText('form:new:')).toBeTruthy();
        created.unmount();

        render(
            <ArtifactSetsPage
                {...base}
                view={{ type: 'edit', id: 's' }}
                data={{ name: 'Set', setId: 's', initial: {} }}
            />
        );

        expect(screen.getByText('form:s:Set')).toBeTruthy();
    });

    it('declares a page for each of its dm sections', () => {
        const pages = ARTIFACTSETS_MODULE_UI({} as never).dmPages ?? {};

        for (const section of ARTIFACTSETS_META.dmSections)
            expect(pages).toHaveProperty(section);
    });
});
