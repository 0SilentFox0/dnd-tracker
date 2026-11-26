// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NewCharacterForm } from '@/components/characters/NewCharacterForm';
import { defaultCharacterFormData } from '@/lib/utils/characters/form/defaults';

const handleSubmit = vi.fn((e: { preventDefault: () => void }) =>
    e.preventDefault()
);

const set = vi.fn();

const basic = { name: '', race: '' };

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
    default: ({ href, children }: { href: string; children: unknown }) => (
        <a href={href}>{children as never}</a>
    ),
}));
vi.mock('@/lib/hooks/characters', () => ({
    useCharacterForm: () => ({
        status: { isLoading: false, error: null },
        formData: defaultCharacterFormData,
        basicInfo: {
            data: { ...defaultCharacterFormData.basicInfo, ...basic },
            set,
        },
        skills: {},
        abilities: {},
        combatStats: {},
        actions: { handleSubmit, setFormData: vi.fn() },
    }),
    useChoiceRefs: () => ({ ready: false }),
    useCreateCharacter: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/lib/hooks/campaigns', () => ({
    useCampaignMembers: () => ({ members: [], isLoading: false }),
}));
vi.mock('@/lib/hooks/classes', () => ({
    useClassMode: () => ({ enabled: false, classes: [], byId: {} }),
}));
vi.mock('@/lib/hooks/races', () => ({ useRaces: () => ({ data: [] }) }));
vi.mock('@/lib/hooks/systems', () => ({
    useCampaignSystem: () => ({
        def: {
            lineage: true,
            characteristics: { defaults: undefined },
            identity: { alignments: true },
        },
        system: { key: 'd20', modules: [] },
    }),
}));
vi.mock('@/lib/utils/rules/systems/stats', () => ({
    statColumnsOf: () => new Set(['classes']),
}));
vi.mock('@/components/systems', () => ({
    systemUiOf: () => ({ hideProgression: false, StatsFields: () => null }),
}));
vi.mock('@/components/characters/basic/CharacterBasicInfo', () => ({
    CharacterBasicInfo: () => <div>basic-tab</div>,
}));
vi.mock('@/components/characters/abilities/CharacterAbilitiesSection', () => ({
    CharacterAbilitiesSection: () => null,
}));
vi.mock('@/components/characters/skills/CharacterSkillsSection', () => ({
    CharacterSkillsSection: () => null,
}));
vi.mock('@/components/characters/stats/SystemFormFields', () => ({
    SystemFormFields: () => null,
}));
vi.mock('@/components/choices/character/CharacterChoicesTab', () => ({
    CharacterChoicesTab: () => null,
}));
vi.mock('@/components/common/fields/ImageUpload', () => ({
    ImageUpload: () => <div>image-upload</div>,
}));

const renderForm = () =>
    render(
        <NewCharacterForm
            campaignId="c1"
            characterType="player"
            systemKey="d20"
        />
    );

afterEach(() => {
    cleanup();
    basic.name = '';
    basic.race = '';
});

describe('NewCharacterForm', () => {
    it('has no portrait section and edits the portrait only through the banner', () => {
        renderForm();
        expect(screen.getByText('basic-tab')).toBeTruthy();
        expect(screen.queryByText('image-upload')).toBeNull();

        fireEvent.click(
            screen.getByRole('button', {
                name: 'characterProfile.portrait.change',
            })
        );
        expect(screen.getByText('image-upload')).toBeTruthy();
    });

    it('shows the question-mark placeholder on an empty form', () => {
        renderForm();
        expect(screen.getAllByText('?').length).toBeGreaterThan(0);
    });

    it('shows the typed name in the banner header', () => {
        basic.name = 'Арвен';
        renderForm();
        expect(screen.getAllByText('Арвен').length).toBeGreaterThan(0);
    });

    it('renders one submit button that submits the form', () => {
        renderForm();

        const submit = screen.getByRole('button', { name: 'characters.form.submit' });

        expect(submit).toHaveAttribute('form', 'character-form');
        fireEvent.click(submit);
        expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
});
