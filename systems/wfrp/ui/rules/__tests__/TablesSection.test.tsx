// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TablesSection } from '../TablesSection';

import '@/components/ui/__tests__/match-media';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { DEFAULT_TABLES } from '@/systems/wfrp/rules/tables/defaults';
import type { TableRow } from '@/systems/wfrp/rules/tables/schema';

const mount = (tables: Record<string, TableRow[] | null> = {}) => {
    const set = vi.fn();

    render(
        <TablesSection
            form={
                {
                    campaignId: 'c',
                    data: { ...DEFAULT_RULES, tables },
                    set,
                } as unknown as Parameters<typeof TablesSection>[0]['form']
            }
        />
    );

    return set;
};

const custom: TableRow[] = [
    { max: 50, text: 'a', effects: [{ type: 'damage', amount: 2 }] },
    { max: 100, text: 'b', effects: [] },
];

afterEach(cleanup);

describe('TablesSection', () => {
    it('shows the default rows for an unset slot', () => {
        mount();

        expect(screen.getByText('battleWfrp.crit.head.1')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'wfrpTables.customize' })
        ).toBeTruthy();
    });

    it('customize never persists a raw key when the translation is missing', () => {
        const set = mount();

        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpTables.customize' })
        );

        const next = set.mock.calls.at(-1)?.[1].critHead;

        expect(next).toHaveLength(DEFAULT_TABLES.critHead.length);
        expect(next[0]).toEqual({
            max: 20,
            effects: [{ type: 'damage', amount: 1 }],
        });
        expect(JSON.stringify(next)).not.toContain('battleWfrp.');
    });

    it('adds an effect to a row', () => {
        const set = mount({ critHead: custom });

        fireEvent.click(
            screen.getAllByRole('button', { name: 'wfrpTables.addEffect' })[1]
        );

        expect(set).toHaveBeenLastCalledWith('tables', {
            critHead: [
                custom[0],
                {
                    max: 100,
                    text: 'b',
                    effects: [{ type: 'damage', amount: 1 }],
                },
            ],
        });
    });

    it('removing a row keeps the last max at 100', () => {
        const set = mount({ critHead: custom });

        fireEvent.click(
            screen.getByRole('button', { name: /wfrpTables.removeRow.*1/ })
        );

        expect(set).toHaveBeenLastCalledWith('tables', {
            critHead: [{ max: 100, text: 'b', effects: [] }],
        });
    });

    it('the last row max is locked and the first from is 1', () => {
        mount({ critHead: custom });

        expect(
            (screen.getByLabelText(/wfrpTables.upTo.*2/) as HTMLInputElement)
                .disabled
        ).toBe(true);
        expect(
            (screen.getByLabelText(/wfrpTables.upTo.*1/) as HTMLInputElement)
                .disabled
        ).toBe(false);
    });

    it('offers only the effect types of the slot', () => {
        mount({
            critHead: [{ max: 100, effects: [{ type: 'damage', amount: 1 }] }],
        });

        fireEvent.keyDown(
            screen.getByRole('combobox', { name: 'wfrpTables.effectType' }),
            { key: 'Enter' }
        );

        const options = screen.getAllByRole('option').map((o) => o.textContent);

        expect(options).toEqual([
            'wfrpTables.effect.damage',
            'wfrpTables.effect.condition',
            'wfrpTables.effect.marker',
        ]);
    });

    it('reset sends null for the slot', () => {
        const set = mount({ critHead: custom });

        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpTables.reset' })
        );

        expect(set).toHaveBeenLastCalledWith('tables', { critHead: null });
    });

    describe('mutation slots', () => {
        const pick = (label: string) => {
            fireEvent.keyDown(
                screen.getByRole('combobox', { name: 'wfrpTables.slot' }),
                { key: 'Enter' }
            );
            fireEvent.click(screen.getByRole('option', { name: label }));
        };

        it('lists the mutation slots and shows signed default effects', () => {
            mount();

            fireEvent.keyDown(
                screen.getByRole('combobox', { name: 'wfrpTables.slot' }),
                { key: 'Enter' }
            );

            const options = screen
                .getAllByRole('option')
                .map((o) => o.textContent);

            expect(options).toEqual(
                expect.arrayContaining([
                    'wfrpTables.slots.mutationPhysical',
                    'wfrpTables.slots.mutationMental',
                ])
            );

            fireEvent.click(
                screen.getByRole('option', {
                    name: 'wfrpTables.slots.mutationPhysical',
                })
            );

            expect(
                screen.getByText('gameTerms.characteristics.ag.short -5')
            ).toBeTruthy();
        });

        it('customize shows effect rows and a characteristic editor with bounds', () => {
            const set = vi.fn();

            render(
                <TablesSection
                    form={
                        {
                            campaignId: 'c',
                            data: {
                                ...DEFAULT_RULES,
                                tables: {
                                    mutationPhysical: [
                                        {
                                            max: 100,
                                            effects: [
                                                {
                                                    type: 'characteristic',
                                                    key: 'ag',
                                                    amount: -5,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                            set,
                        } as unknown as Parameters<
                            typeof TablesSection
                        >[0]['form']
                    }
                />
            );

            pick('wfrpTables.slots.mutationPhysical');

            expect(
                screen.getByRole('combobox', {
                    name: 'wfrpTables.characteristic',
                })
            ).toBeTruthy();

            const amount = screen.getByRole('textbox', {
                name: 'wfrpTables.amount',
            });

            fireEvent.change(amount, { target: { value: '-99' } });
            fireEvent.blur(amount);

            expect(set).toHaveBeenLastCalledWith('tables', {
                mutationPhysical: [
                    {
                        max: 100,
                        effects: [
                            { type: 'characteristic', key: 'ag', amount: -30 },
                        ],
                    },
                ],
            });
        });

        it('never commits a zero effect amount', () => {
            const set = vi.fn();

            render(
                <TablesSection
                    form={
                        {
                            campaignId: 'c',
                            data: {
                                ...DEFAULT_RULES,
                                tables: {
                                    mutationPhysical: [
                                        {
                                            max: 100,
                                            effects: [
                                                {
                                                    type: 'characteristic',
                                                    key: 'ag',
                                                    amount: -5,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                            set,
                        } as unknown as Parameters<
                            typeof TablesSection
                        >[0]['form']
                    }
                />
            );

            pick('wfrpTables.slots.mutationPhysical');

            const amount = screen.getByRole('textbox', {
                name: 'wfrpTables.amount',
            });

            fireEvent.change(amount, { target: { value: '0' } });
            fireEvent.blur(amount);

            expect(set).toHaveBeenLastCalledWith('tables', {
                mutationPhysical: [
                    {
                        max: 100,
                        effects: [
                            { type: 'characteristic', key: 'ag', amount: -1 },
                        ],
                    },
                ],
            });
        });

        it('add effect starts with a characteristic', () => {
            const set = vi.fn();

            render(
                <TablesSection
                    form={
                        {
                            campaignId: 'c',
                            data: {
                                ...DEFAULT_RULES,
                                tables: {
                                    mutationMental: [{ max: 100, effects: [] }],
                                },
                            },
                            set,
                        } as unknown as Parameters<
                            typeof TablesSection
                        >[0]['form']
                    }
                />
            );

            pick('wfrpTables.slots.mutationMental');
            fireEvent.click(
                screen.getByRole('button', { name: 'wfrpTables.addEffect' })
            );

            expect(set).toHaveBeenLastCalledWith('tables', {
                mutationMental: [
                    {
                        max: 100,
                        effects: [
                            { type: 'characteristic', key: 'ws', amount: -5 },
                        ],
                    },
                ],
            });
        });

        it('caps effects at 3 in a mutation slot but allows 4 elsewhere', () => {
            const effects = [1, 2, 3].map(() => ({
                type: 'characteristic' as const,
                key: 'ag' as const,
                amount: -5,
            }));

            render(
                <TablesSection
                    form={
                        {
                            campaignId: 'c',
                            data: {
                                ...DEFAULT_RULES,
                                tables: {
                                    mutationPhysical: [{ max: 100, effects }],
                                    critHead: [
                                        {
                                            max: 100,
                                            effects: [...effects, effects[0]]
                                                .map(() => ({
                                                    type: 'damage' as const,
                                                    amount: 1,
                                                }))
                                                .slice(0, 3),
                                        },
                                    ],
                                },
                            },
                            set: vi.fn(),
                        } as unknown as Parameters<
                            typeof TablesSection
                        >[0]['form']
                    }
                />
            );

            expect(
                (
                    screen.getByRole('button', {
                        name: 'wfrpTables.addEffect',
                    }) as HTMLButtonElement
                ).disabled
            ).toBe(false);

            pick('wfrpTables.slots.mutationPhysical');

            expect(
                (
                    screen.getByRole('button', {
                        name: 'wfrpTables.addEffect',
                    }) as HTMLButtonElement
                ).disabled
            ).toBe(true);
        });
    });
});
