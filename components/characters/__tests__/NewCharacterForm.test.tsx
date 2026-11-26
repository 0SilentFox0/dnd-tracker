// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NewCharacterForm } from '@/components/characters/NewCharacterForm';

const set = vi.fn();

const state = vi.hoisted(() => ({
    basic: { name: '', race: '', avatar: '' } as Record<string, string>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/components/characters/basic/CharacterBasicInfo', () => ({
    CharacterBasicInfo: () => <div>basic-info</div>,
}));

vi.mock('@/components/character-profile/sheet/PortraitDialog', () => ({
    PortraitDialog: ({ open }: { open: boolean }) =>
        open ? <div role="dialog">portrait-dialog</div> : null,
}));

vi.mock('@/components/characters/skills/CharacterSkillsSection', () => ({
    CharacterSkillsSection: () => null,
}));

vi.mock('@/components/characters/abilities/CharacterAbilitiesSection', () => ({
    CharacterAbilitiesSection: () => null,
}));

vi.mock('@/components/characters/stats/SystemFormFields', () => ({
    SystemFormFields: () => null,
}));

vi.mock('@/components/systems', () => ({
    systemUiOf: () => ({ hideProgression: false, StatsFields: () => null }),
}));

vi.mock('@/lib/hooks/campaigns', () => ({
    useCampaignMembers: () => ({ members: [], isLoading: false }),
}));

vi.mock('@/lib/hooks/races', () => ({ useRaces: () => ({ data: [] }) }));

vi.mock('@/lib/hooks/classes', () => ({
    useClassMode: () => ({ enabled: false, byId: {}, classes: [] }),
}));

vi.mock('@/lib/hooks/systems', () => ({
    useCampaignSystem: () => ({
        def: {
            lineage: true,
            identity: { alignments: true },
            characteristics: { defaults: {} },
            stats: { columns: [] },
        },
        system: { key: 'd20', modules: [] },
    }),
}));

vi.mock('@/lib/utils/rules/systems/stats', () => ({
    statColumnsOf: () => new Set<string>(),
}));

vi.mock('@/lib/hooks/characters', () => ({
    useCreateCharacter: () => ({ mutateAsync: vi.fn() }),
    useChoiceRefs: () => ({ ready: false }),
    useCharacterForm: () => ({
        status: { isLoading: false, error: null },
        formData: {},
        basicInfo: { data: state.basic, set },
        skills: {},
        abilities: {},
        actions: { handleSubmit: vi.fn(), setFormData: vi.fn() },
    }),
}));

afterEach(cleanup);

const renderForm = () =>
    render(
        <NewCharacterForm
            campaignId="c1"
            characterType="PLAYER"
            systemKey="d20"
        />
    );

describe('NewCharacterForm', () => {
    it('shows the placeholder initial while the name is empty', () => {
        renderForm();

        expect(screen.getByTestId('sheet-banner').textContent).toContain('?');
    });

    it('opens the portrait dialog from the banner and has no portrait section', () => {
        renderForm();

        expect(screen.queryByRole('dialog')).toBeNull();
        fireEvent.click(
            screen.getByRole('button', {
                name: /characterProfile\.portrait\.add/,
            })
        );
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.queryByText(/sections\.portrait/)).toBeNull();
    });

    it('keeps one submit button wired to the form', () => {
        renderForm();

        const submit = screen.getAllByRole('button', {
            name: 'characters.form.submit',
        });

        expect(submit).toHaveLength(1);
        expect(submit[0].getAttribute('form')).toBe('character-form');
    });
});
