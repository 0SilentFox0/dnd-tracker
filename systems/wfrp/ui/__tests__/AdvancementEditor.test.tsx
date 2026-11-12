// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdvancementEditor } from '../AdvancementEditor';

import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';

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
vi.mock('@/lib/hooks/careers', () => ({
    useCareers: () => ({ data: [{ id: 'car', name: 'Soldier' }] }),
}));
vi.mock('@/lib/hooks/feats', () => ({
    useFeats: () => ({
        data: [
            { id: 'f1', name: 'Marksman' },
            { id: 'f2', name: 'Hardy' },
        ],
    }),
}));

const p = (key: string) => `wfrpCareers.profile.${key}`;

const mount = (data = DEFAULT_CHARACTERISTICS) => {
    const set = vi.fn();

    const update = (fn: (prev: unknown) => Record<string, unknown>) => {
        const next = fn(data);

        for (const [key, value] of Object.entries(next))
            if (
                JSON.stringify(value) !==
                JSON.stringify((data as Record<string, unknown>)[key])
            )
                set(key, value);
    };

    render(
        <AdvancementEditor
            campaignId="c"
            bindings={{ characteristics: { data, update } } as never}
        />
    );

    return set;
};

afterEach(cleanup);

describe('AdvancementEditor', () => {
    it('assigns a career at tier 1 with no ticks', () => {
        const set = mount();

        fireEvent.change(screen.getByLabelText(p('career')), {
            target: { value: 'car' },
        });

        expect(set).toHaveBeenCalledWith('career', {
            careerId: 'car',
            tier: 1,
            ticks: [],
        });
    });

    it('clears the career', () => {
        const set = mount({
            ...DEFAULT_CHARACTERISTICS,
            career: { careerId: 'car', tier: 2, ticks: [] },
        });

        fireEvent.click(screen.getByRole('button', { name: p('clear') }));

        expect(set).toHaveBeenCalledWith('career', undefined);
    });

    it('adds a talent at rank 1 and removes another', () => {
        const set = mount({ ...DEFAULT_CHARACTERISTICS, talents: { f2: 2 } });

        fireEvent.change(screen.getByLabelText(p('addTalent')), {
            target: { value: 'f1' },
        });

        expect(set).toHaveBeenCalledWith('talents', { f2: 2, f1: 1 });

        fireEvent.click(
            screen.getByRole('button', { name: new RegExp(p('remove')) })
        );

        expect(set).toHaveBeenLastCalledWith('talents', {});
    });
});
