// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WfrpDraftForm } from '../WfrpDraftForm';

import { ApiError } from '@/lib/api/client';
import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/systems/wfrp/api/characters', () => ({
    createWfrpDraft: vi.fn(),
    updateWfrpDraftIdentity: vi.fn(),
}));

vi.mock('@/components/common/fields/ImageUpload', () => ({
    ImageUpload: () => null,
}));

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

const data = vi.hoisted(() => ({
    races: [] as unknown[],
    profiles: [] as unknown[],
}));

vi.mock('@/lib/hooks/campaigns', () => ({
    useCampaignMembers: () => ({
        members: [{ id: 'p1', displayName: 'Anna', email: 'a@x.io' }],
    }),
    useCampaignRules: () => ({
        data: {
            system: { key: 'wfrp' },
            advancement: DEFAULT_ADVANCEMENT_RULES,
        },
    }),
}));

vi.mock('@/systems/wfrp/hooks/careers', () => ({
    useCareers: () => ({
        data: [
            { id: 'ca', name: 'Soldier' },
            { id: 'cb', name: 'Scribe' },
        ],
    }),
}));

vi.mock('@/lib/hooks/feats', () => ({
    useFeats: () => ({
        data: [
            { id: 'f0', name: 'Hardy' },
            { id: 'f1', name: 'Lucky' },
        ],
    }),
}));

vi.mock('@/lib/hooks/races', () => ({
    useRaces: () => ({ data: data.races, isPending: false }),
}));
vi.mock('@/systems/wfrp/hooks/useRaceProfiles', () => ({
    useRaceProfiles: () => ({ data: data.profiles, isPending: false }),
}));

const profile = {
    mods: { ws: 5 },
    move: 4,
    fate: 2,
    extraWounds: 0,
    talents: ['f0'],
    randomTalentCount: 1,
    randomTalents: [{ max: 100, featId: 'f1' }],
    careerTable: [
        { max: 50, careerId: 'ca' },
        { max: 100, careerId: 'cb' },
    ],
};

const mount = (dm?: { characterType: 'player' | 'npc_hero' }) =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <WfrpDraftForm campaignId="c1" dm={dm} />
        </QueryClientProvider>
    );

const next = () =>
    screen.getByRole('button', { name: 'wfrpCreation.wizard.next' });

beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    data.races = [{ id: 'r1', name: 'Human' }];
    data.profiles = [{ raceId: 'r1', profile }];
});

afterEach(cleanup);

describe('WfrpDraftForm', () => {
    it('shows the not-ready empty state when no species has a usable profile', () => {
        data.profiles = [];

        mount();

        expect(
            screen.getByText('wfrpCreation.species.notReadyTitle')
        ).toBeTruthy();
    });

    it('walks the steps in order and blocks Next until each is valid', () => {
        mount();

        expect((next() as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getByRole('radio', { name: /Human/ }));
        fireEvent.click(next());

        expect(screen.getByText('wfrpCreation.career.hint')).toBeTruthy();
        expect((next() as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.career.roll' })
        );

        const options = within(
            screen.getByRole('radiogroup', {
                name: 'wfrpCreation.career.pickLabel',
            })
        ).getAllByRole('radio');

        expect(options).toHaveLength(1);
        expect(options[0].getAttribute('aria-checked')).toBe('true');
        expect((next() as HTMLButtonElement).disabled).toBe(false);

        fireEvent.click(next());

        expect(screen.getByText('wfrpCreation.stats.hint')).toBeTruthy();
        expect((next() as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.stats.roll' })
        );

        expect(screen.getAllByTestId(/^stat-/)).toHaveLength(10);

        fireEvent.click(next());
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.talents.roll' })
        );
        fireEvent.click(next());
        fireEvent.click(next());

        expect(screen.getByText('wfrpCreation.identity.hint')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'wfrpCreation.wizard.submit' })
        ).toHaveProperty('disabled', true);

        fireEvent.change(screen.getByLabelText(/wfrpCreation.identity.name/), {
            target: { value: 'Hans' },
        });

        expect(
            screen.getByRole('button', { name: 'wfrpCreation.wizard.submit' })
        ).toHaveProperty('disabled', false);
        expect(
            screen.getByText(/wfrpCreation.identity.experience/)
        ).toBeTruthy();
    });

    it('story step is optional, sits between talents and identity and rolls into the biography', () => {
        mount();

        fireEvent.click(screen.getByRole('radio', { name: /Human/ }));
        fireEvent.click(next());
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.career.roll' })
        );
        fireEvent.click(next());
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.stats.roll' })
        );
        fireEvent.click(next());
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.talents.roll' })
        );
        fireEvent.click(next());

        expect(screen.getByText('wfrpCreation.story.hint')).toBeTruthy();
        expect((next() as HTMLButtonElement).disabled).toBe(false);

        fireEvent.click(
            screen.getByRole('button', {
                name: 'wfrpCreation.story.roll wfrpCreation.story.questions.origin',
            })
        );
        fireEvent.click(next());

        expect(
            (
                screen.getByLabelText(
                    /wfrpCreation.identity.background/
                ) as HTMLTextAreaElement
            ).value
        ).toContain('wfrpCreation.story.sentences.origin');
    });

    it('characterId mode shows only the identity step', () => {
        render(
            <QueryClientProvider client={new QueryClient()}>
                <WfrpDraftForm
                    campaignId="c1"
                    characterId="ch1"
                    initialIdentity={{ name: 'Hans' }}
                />
            </QueryClientProvider>
        );

        expect(screen.getByText('wfrpCreation.identity.reopenNote')).toBeTruthy();
        expect(screen.queryByText('wfrpCreation.story.hint')).toBeNull();
    });

    it('shows translated per-code messages for server issues and falls back to the general text', async () => {
        const { createWfrpDraft } = await import(
            '@/systems/wfrp/api/characters'
        );

        mount();

        fireEvent.click(screen.getByRole('radio', { name: /Human/ }));
        fireEvent.click(next());
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.career.roll' })
        );
        fireEvent.click(next());
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.stats.roll' })
        );
        fireEvent.click(next());
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.talents.roll' })
        );
        fireEvent.click(next());
        fireEvent.click(next());
        fireEvent.change(screen.getByLabelText(/wfrpCreation.identity.name/), {
            target: { value: 'Hans' },
        });

        vi.mocked(createWfrpDraft).mockRejectedValueOnce(
            new ApiError('invalid', 400, '/x', {
                issues: ['CAREER_NOT_IN_TABLE', 'TALENT_COUNT'],
            })
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.wizard.submit' })
        );

        expect(
            await screen.findByText(
                'wfrpCreation.errors.CAREER_NOT_IN_TABLE · wfrpCreation.errors.TALENT_COUNT'
            )
        ).toBeTruthy();

        vi.mocked(createWfrpDraft).mockRejectedValueOnce(
            new ApiError('plain failure', 500, '/x')
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.wizard.submit' })
        );

        expect(await screen.findByText('plain failure')).toBeTruthy();
    });

    it('rearranging swaps neighbouring values', () => {
        mount();

        fireEvent.click(screen.getByRole('radio', { name: /Human/ }));
        fireEvent.click(next());
        fireEvent.click(
            screen.getAllByRole('button', {
                name: 'wfrpCreation.career.roll',
            })[0]
        );
        fireEvent.click(
            within(
                screen.getByRole('radiogroup', {
                    name: 'wfrpCreation.career.pickLabel',
                })
            ).getAllByRole('radio')[0]
        );
        fireEvent.click(next());
        fireEvent.click(
            screen.getByRole('radio', {
                name: /wfrpCreation.stats.modes.rearranged/,
            })
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'wfrpCreation.stats.roll' })
        );

        const read = () =>
            screen.getAllByTestId(/^stat-/).map((e) => e.textContent);

        const before = read();

        fireEvent.click(
            screen.getByRole('button', {
                name: /wfrpCreation.stats.down: gameTerms.characteristics.ws.label/,
            })
        );

        const after = read();

        expect(after[0]).toBe(before[1]);
        expect(after[1]).toBe(before[0]);
    });

    describe('DM variant', () => {
        const toIdentity = () => {
            fireEvent.click(screen.getByRole('radio', { name: /Human/ }));
            fireEvent.click(next());
            fireEvent.click(
                screen.getByRole('button', { name: 'wfrpCreation.career.roll' })
            );
            fireEvent.click(next());
            fireEvent.click(
                screen.getByRole('button', { name: 'wfrpCreation.stats.roll' })
            );
            fireEvent.click(next());
            fireEvent.click(
                screen.getByRole('button', {
                    name: 'wfrpCreation.talents.roll',
                })
            );
            fireEvent.click(next());
            fireEvent.click(next());
            fireEvent.change(
                screen.getByLabelText(/wfrpCreation.identity.name/),
                { target: { value: 'Hans' } }
            );
        };

        const submitButton = () =>
            screen.getByRole('button', { name: 'wfrpCreation.wizard.submit' });

        it('player type needs a chosen player and links cancel to the DM list', async () => {
            const { createWfrpDraft } = await import(
                '@/systems/wfrp/api/characters'
            );

            mount({ characterType: 'player' });

            expect(
                screen
                    .getByRole('link', { name: 'common.actions.cancel' })
                    .getAttribute('href')
            ).toBe('/campaigns/c1/dm/characters');

            toIdentity();

            expect(submitButton()).toHaveProperty('disabled', true);

            fireEvent.change(screen.getByLabelText(/wfrpCreation.identity.player/), {
                target: { value: 'p1' },
            });

            expect(submitButton()).toHaveProperty('disabled', false);

            fireEvent.click(submitButton());

            await vi.waitFor(() =>
                expect(createWfrpDraft).toHaveBeenCalledWith(
                    'c1',
                    expect.objectContaining({
                        owner: { type: 'player', controlledBy: 'p1' },
                    })
                )
            );
        });

        it('shows the story step before identity', () => {
            mount({ characterType: 'npc_hero' });
            toIdentity();

            expect(screen.queryByText('wfrpCreation.story.hint')).toBeNull();
            expect(
                screen.getByText('wfrpCreation.wizard.steps.story')
            ).toBeTruthy();
        });

        it('npc hero shows no player picker', () => {
            mount({ characterType: 'npc_hero' });
            toIdentity();

            expect(
                screen.queryByLabelText(/wfrpCreation.identity.player/)
            ).toBeNull();
            expect(submitButton()).toHaveProperty('disabled', false);
        });
    });
});
