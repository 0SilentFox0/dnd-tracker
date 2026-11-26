// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RaceEditForm } from '@/components/races/RaceEditForm';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import type { Race } from '@/types/races';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/content-import/shared/SourceNotes', () => ({
    SourceNotes: () => null,
}));

vi.mock('@/components/races/RaceCard', () => ({
    RaceCard: ({ race }: { race: { name: string } }) => <p>card-{race.name}</p>,
}));

vi.mock('@/components/races/useRaceFormTabs', () => ({
    useRaceFormTabs: ({
        form,
    }: {
        form: { data: { name: string }; set: (d: never) => void };
    }) => [
        {
            id: 'basic',
            label: 'basic',
            content: (
                <input
                    aria-label="name"
                    value={form.data.name}
                    onChange={(e) =>
                        form.set({
                            ...form.data,
                            name: e.target.value,
                        } as never)
                    }
                />
            ),
        },
    ],
}));

vi.mock('@/lib/hooks/races', () => ({
    useRaceForm: (_c: string, _id: string, initial: unknown) => {
        const [data, set] = React.useState(initial);

        return {
            form: { data, set },
            abilities: { valid: true, errors: 0, onValidityChange: vi.fn() },
            status: { isSaving: false, error: null },
            actions: { submit: vi.fn(), cancel: vi.fn() },
        };
    },
}));

vi.mock('@/lib/hooks/systems', () => ({
    useRuleSystem: () => ({ key: null }),
}));

beforeEach(() => mockMatchMedia(false));
afterEach(cleanup);

describe('RaceEditForm preview', () => {
    it('shows the live name in the aside card', () => {
        renderWithConfirm(
            <RaceEditForm
                campaignId="c1"
                race={
                    {
                        id: 'r1',
                        campaignId: 'c1',
                        name: 'Elf',
                        availableSkills: [],
                        disabledSkills: [],
                    } as unknown as Race
                }
            />
        );

        const side = () => document.querySelector('.hud-form-side');

        expect(side()).toHaveTextContent('card-Elf');

        fireEvent.change(screen.getByLabelText('name'), {
            target: { value: 'Dwarf' },
        });

        expect(side()).toHaveTextContent('card-Dwarf');
    });
});
