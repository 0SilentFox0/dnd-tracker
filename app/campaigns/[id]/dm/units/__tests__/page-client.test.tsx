// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DMUnitsPageClient } from '@/app/campaigns/[id]/dm/units/page-client';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { unitKeys } from '@/lib/hooks/units/keys';
import {
    mergeRules,
    parseRules,
    RulesetPatchSchema,
} from '@/lib/utils/rules/schema';
import type { Unit } from '@/types/units';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const races = [
    {
        id: 'r1',
        campaignId: 'c1',
        name: 'Гобліни',
        color: '#22c55e',
        icon: null,
        availableSkills: [],
        disabledSkills: [],
    },
];

const base = {
    campaignId: 'c1',
    level: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 12,
    initiative: 0,
    speed: 30,
    maxHp: 7,
    proficiencyBonus: 2,
    minTargets: 1,
    maxTargets: 1,
    attacks: [],
    immunities: [],
    knownSpells: [],
    avatar: null,
};

const goblin = {
    ...base,
    id: 'u1',
    name: 'Гоблін-лучник',
    raceId: 'r1',
} as unknown as Unit;

const wolf = {
    ...base,
    id: 'u2',
    name: 'Вовк',
    raceId: null,
} as unknown as Unit;

const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
    });

function renderPage(
    units: Unit[],
    initialRules: Record<string, unknown> = {},
    failSave = false
) {
    let rules = parseRules({ system: { key: 'homm' }, ...initialRules });

    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
            if (String(url).endsWith('/rules')) {
                if (init?.method === 'PATCH') {
                    if (failSave)
                        return new Response(
                            JSON.stringify({ error: 'Save failed' }),
                            { status: 500 }
                        );

                    const merged = mergeRules(
                        rules,
                        RulesetPatchSchema.parse(JSON.parse(String(init.body)))
                    );

                    if (merged.ok) rules = merged.rules;
                }

                return json(rules);
            }

            return json(String(url).includes('/races') ? races : units);
        })
    );

    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const view = render(
        <QueryClientProvider client={client}>
            <ConfirmProvider>
                <DMUnitsPageClient campaignId="c1" initialUnits={units} />
            </ConfirmProvider>
        </QueryClientProvider>
    );

    return { ...view, client, getRules: () => rules };
}

describe('DM units list', () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('порожній список — EmptyState із заголовком', () => {
        renderPage([]);

        expect(screen.getByText('units.page.emptyTitle')).toBeInTheDocument();
    });

    it('раси згорнуті за замовчуванням, «Без раси» — остання', async () => {
        mockMatchMedia(false);
        renderPage([goblin, wolf]);

        await screen.findByText('Гобліни');

        expect(
            screen
                .getAllByText(/^(Гобліни|gameTerms\.ungrouped\.race)$/)
                .map((n) => n.textContent)
        ).toEqual(['Гобліни', 'gameTerms.ungrouped.race']);
        expect(screen.queryByText('Гоблін-лучник')).toBeNull();
        expect(screen.queryByText('Вовк')).toBeNull();
    });

    it('пошук розгортає групу зі збігом і ховає групи без збігів', async () => {
        mockMatchMedia(false);
        renderPage([goblin, wolf]);
        await screen.findByText('Гобліни');

        fireEvent.change(screen.getByLabelText('units.toolbar.search'), {
            target: { value: 'вовк' },
        });

        expect(await screen.findByText('Вовк')).toBeInTheDocument();
        expect(screen.queryByText('Гобліни')).toBeNull();
    });

    it('clears a group filter when its last unit disappears', async () => {
        mockMatchMedia(false);

        const view = renderPage([goblin, wolf]);

        await screen.findByText('Гобліни');
        fireEvent.click(screen.getByRole('button', { name: /Гобліни · 1/ }));
        act(() => view.client.setQueryData(unitKeys.list('c1'), [wolf]));

        await waitFor(() =>
            expect(
                screen.queryByRole('button', { name: /Гобліни · 1/ })
            ).toBeNull()
        );
        expect(
            screen.getByText('gameTerms.ungrouped.race')
        ).toBeInTheDocument();
    });

    it('чіп раси лишає лише її групу', async () => {
        mockMatchMedia(false);
        renderPage([goblin, wolf]);
        await screen.findByText('Гобліни');

        fireEvent.click(screen.getByRole('button', { name: /Гобліни · 1/ }));

        expect(
            screen.getByRole('button', { name: /Гобліни · 1/ })
        ).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByText('gameTerms.ungrouped.race')).toBeNull();
    });
});

describe('unit group editing', () => {
    const beast = {
        ...wolf,
        avatar: 'https://example.com/wolf.png',
        statblock: { creatureType: 'beast' },
    } as Unit;

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('hides unused races and gives SRD groups an avatar', async () => {
        mockMatchMedia(false);

        const view = renderPage([beast]);

        await screen.findByText('gameTerms.creatureTypes.beast');
        await waitFor(() => expect(screen.queryByText('Гобліни')).toBeNull());
        expect(screen.queryByText('gameTerms.ungrouped.race')).toBeNull();
        expect(view.container.querySelector('img')).toHaveAttribute(
            'src',
            expect.stringContaining('wolf.png')
        );
    });

    it('edits a collapsed group and keeps the name and image after reload', async () => {
        mockMatchMedia(false);

        const view = renderPage([beast]);

        fireEvent.click(
            await screen.findByRole('button', { name: /units.group.edit/ })
        );

        const dialog = await screen.findByRole('dialog');

        expect(screen.queryByText('Вовк')).toBeNull();
        fireEvent.change(
            within(dialog).getByLabelText(/units.groupDialog.name/),
            { target: { value: 'Лісові звірі' } }
        );
        fireEvent.change(
            within(dialog).getByLabelText('units.groupDialog.icon'),
            { target: { value: 'https://example.com/forest.png' } }
        );
        fireEvent.click(
            within(dialog).getByRole('button', { name: 'common.actions.save' })
        );

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(await screen.findByText('Лісові звірі')).toBeInTheDocument();
        expect(beast.statblock?.creatureType).toBe('beast');

        const saved = view.getRules();

        view.unmount();

        const reloaded = renderPage([beast], saved);

        expect(await screen.findByText('Лісові звірі')).toBeInTheDocument();
        expect(reloaded.container.querySelector('img')).toHaveAttribute(
            'src',
            expect.stringContaining('forest.png')
        );
    });

    it('keeps automatic images when only renaming and restores them when clearing an override', async () => {
        mockMatchMedia(false);

        const view = renderPage([beast]);

        fireEvent.click(
            await screen.findByRole('button', { name: /units.group.edit/ })
        );

        let dialog = await screen.findByRole('dialog');

        fireEvent.change(
            within(dialog).getByLabelText(/units.groupDialog.name/),
            { target: { value: 'Звірі' } }
        );
        fireEvent.click(
            within(dialog).getByRole('button', { name: 'common.actions.save' })
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(view.getRules().encounters.unitGroups?.['type:beast']).toEqual({
            name: 'Звірі',
            icon: null,
        });

        view.unmount();

        const reloaded = renderPage([beast], {
            encounters: {
                unitGroups: {
                    'type:beast': {
                        name: 'Звірі',
                        icon: 'https://example.com/custom.png',
                    },
                },
            },
        });

        await screen.findByText('Звірі');
        fireEvent.click(
            screen.getByRole('button', { name: /units.group.edit/ })
        );
        dialog = await screen.findByRole('dialog');
        fireEvent.change(
            within(dialog).getByLabelText('units.groupDialog.icon'),
            { target: { value: '' } }
        );
        expect(dialog.querySelector('img')).toHaveAttribute(
            'src',
            expect.stringContaining('wolf.png')
        );
        fireEvent.click(
            within(dialog).getByRole('button', { name: 'common.actions.save' })
        );
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(reloaded.container.querySelector('img')).toHaveAttribute(
            'src',
            expect.stringContaining('wolf.png')
        );
    });

    it('retains the form values when saving fails', async () => {
        mockMatchMedia(false);
        renderPage([beast], {}, true);
        fireEvent.click(
            await screen.findByRole('button', { name: /units.group.edit/ })
        );

        const dialog = await screen.findByRole('dialog');

        fireEvent.change(
            within(dialog).getByLabelText(/units.groupDialog.name/),
            { target: { value: 'Retry me' } }
        );
        fireEvent.click(
            within(dialog).getByRole('button', { name: 'common.actions.save' })
        );

        expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
        expect(
            within(dialog).getByLabelText(/units.groupDialog.name/)
        ).toHaveValue('Retry me');
    });
});
