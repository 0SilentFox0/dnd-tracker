// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { sheetFixture } from '@/components/character-profile/__tests__/sheet-fixture';
import { systemUiOf } from '@/components/systems';
import { ArtifactSetsSection } from '@/systems/artifactsets/ui/ArtifactSetsSection';
import type { CharacterSheet } from '@/types/characters';

const withSets = (sets: unknown[]): CharacterSheet =>
    ({
        ...sheetFixture,
        items: { ...sheetFixture.items, sets },
    }) as unknown as CharacterSheet;

const set = {
    setId: 's1',
    name: 'Hunter',
    have: 1,
    total: 3,
    complete: false,
    effects: [],
};

describe('artifactsets item section', () => {
    afterEach(cleanup);

    it('homm and dnd5e + artifactsets carry the section, bare dnd5e does not', () => {
        expect(systemUiOf('homm').sheet?.itemSections).toEqual([
            ArtifactSetsSection,
        ]);
        expect(
            systemUiOf('dnd5e', ['artifactsets']).sheet?.itemSections
        ).toEqual([ArtifactSetsSection]);
        expect(systemUiOf('dnd5e', []).sheet?.itemSections ?? []).toHaveLength(
            0
        );
    });

    it('editor wraps the list in a titled section, inventory is the bare list', () => {
        const editor = render(
            <ArtifactSetsSection sheet={withSets([set])} variant="editor" />
        );

        expect(editor.container.querySelector('ul')).not.toBeNull();
        expect(editor.container.textContent).toContain('sets.title');
        editor.unmount();

        const inventory = render(
            <ArtifactSetsSection sheet={withSets([set])} variant="inventory" />
        );

        expect(inventory.container.querySelector('ul')).not.toBeNull();
        expect(inventory.container.textContent).not.toContain('sets.title');
    });

    it('renders nothing without sets', () => {
        const { container } = render(
            <ArtifactSetsSection sheet={withSets([])} variant="editor" />
        );

        expect(container.innerHTML).toBe('');
    });
});
