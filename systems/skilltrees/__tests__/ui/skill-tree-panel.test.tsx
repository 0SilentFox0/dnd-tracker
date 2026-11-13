// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sheetFixture } from '@/components/character-profile/__tests__/sheet-fixture';
import { systemUiOf } from '@/components/systems';
import type { CharacterSheet } from '@/types/characters';

const current = vi.hoisted(() => ({
    sheet: null as unknown as CharacterSheet,
}));

vi.mock('@/components/character-profile/ProfileContext', () => ({
    useProfile: () => ({
        campaignId: 'c1',
        characterId: 'h1',
        sheet: current.sheet,
        canEdit: true,
    }),
}));
vi.mock('@/components/skill-tree/progression/ProgressionPanel', () => ({
    ProgressionPanel: () => <div data-testid="panel" />,
}));

import { SkillTreePanel } from '@/systems/skilltrees/ui/SkillTreePanel';

describe('skilltrees path panel', () => {
    afterEach(cleanup);

    it('homm and dnd5e + skilltrees carry the panel, bare dnd5e does not', () => {
        expect(systemUiOf('homm').sheet?.pathPanels).toEqual([SkillTreePanel]);
        expect(systemUiOf('dnd5e', ['skilltrees']).sheet?.pathPanels).toEqual([
            SkillTreePanel,
        ]);
        expect(systemUiOf('dnd5e', []).sheet?.pathPanels ?? []).toHaveLength(0);
    });

    it('shows the tree without classes and the personal skill', () => {
        current.sheet = {
            ...sheetFixture,
            classProgression: [],
            personalSkill: {
                name: 'Spark',
                icon: null,
                description: 'Burns',
            },
        } as unknown as CharacterSheet;

        render(<SkillTreePanel manage={false} />);

        expect(screen.getByTestId('panel')).toBeTruthy();
        expect(screen.getByText('Spark')).toBeTruthy();
    });

    it('hides the tree when the hero has class progressions', () => {
        current.sheet = {
            ...sheetFixture,
            classProgression: [{ classId: 'f' }],
        } as unknown as CharacterSheet;

        render(<SkillTreePanel manage={false} />);

        expect(screen.queryByTestId('panel')).toBeNull();
    });
});
