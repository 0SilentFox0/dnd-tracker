// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SpeciesProfileEditor } from '../SpeciesProfileEditor';

vi.mock('@/components/ui/select-field', () => ({
    SelectField: ({
        value,
        options,
        onValueChange,
        'aria-label': label,
    }: {
        value: string;
        options: { value: string; label: string }[];
        onValueChange: (v: string) => void;
        'aria-label'?: string;
    }) => (
        <select
            aria-label={label}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            <option value="">-</option>
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

const mutate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/hooks/careers', () => ({
    useCareers: () => ({
        data: [
            { id: 'ca', name: 'Soldier' },
            { id: 'cb', name: 'Scribe' },
        ],
    }),
}));

vi.mock('@/lib/hooks/feats', () => ({
    useFeats: () => ({ data: [{ id: 'f0', name: 'Hardy' }] }),
}));

vi.mock('@/systems/wfrp/hooks', async (orig) => ({
    ...(await orig<object>()),
    useRaceProfiles: () => ({
        isPending: false,
        data: [
            {
                raceId: 'r1',
                profile: {
                    mods: {},
                    move: 4,
                    fate: 2,
                    extraWounds: 0,
                    talents: [],
                    randomTalentCount: 0,
                    randomTalents: [],
                    careerTable: [
                        { max: 50, careerId: 'ca' },
                        { max: 100, careerId: 'cb' },
                    ],
                },
            },
        ],
    }),
    useSaveRaceProfile: () => ({ mutate, isPending: false, error: null }),
}));

const mount = () =>
    render(<SpeciesProfileEditor campaignId="c1" raceId="r1" />);

const save = () =>
    screen.getByRole('button', {
        name: 'wfrpCreation.editor.save',
    }) as HTMLButtonElement;

afterEach(() => {
    cleanup();
    mutate.mockReset();
});

describe('SpeciesProfileEditor', () => {
    it('saves a valid profile through useSaveRaceProfile', () => {
        mount();

        expect(save().disabled).toBe(false);

        fireEvent.click(save());

        expect(mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                raceId: 'r1',
                profile: expect.objectContaining({
                    move: 4,
                    careerTable: [
                        { max: 50, careerId: 'ca' },
                        { max: 100, careerId: 'cb' },
                    ],
                }),
            }),
            expect.anything()
        );
    });

    it('adds and removes table rows', () => {
        mount();

        fireEvent.click(
            screen.getAllByRole('button', {
                name: 'wfrpCreation.editor.addRow',
            })[0]
        );

        expect(
            screen.getAllByLabelText(/wfrpCreation.editor.career \d/)
        ).toHaveLength(3);
        expect(save().disabled).toBe(true);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'wfrpCreation.editor.removeRow 3',
            })
        );

        expect(
            screen.getAllByLabelText(/wfrpCreation.editor.career \d/)
        ).toHaveLength(2);
        expect(save().disabled).toBe(false);
    });

    it('blocks save when limits are not ascending', () => {
        mount();

        const first = screen.getByLabelText('wfrpCreation.editor.max 1');

        fireEvent.change(first, { target: { value: '100' } });
        fireEvent.blur(first);

        expect(
            screen.getByText('wfrpCreation.editor.errors.tableAscending')
        ).toBeTruthy();
        expect(save().disabled).toBe(true);
    });
});
