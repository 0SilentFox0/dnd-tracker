// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InfoReferenceClient } from '@/components/campaigns/info/InfoReferenceClient';
import { render } from '@/lib/i18n/test/render-uk';
import type {
    SkillForReference,
    SpellForReference,
} from '@/types/info-reference';

vi.unmock('next-intl');

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/campaigns/c1/info',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/campaigns/info/detail/SpellReferenceDetail', () => ({
    SpellReferenceDetail: ({
        item,
        isDM,
    }: {
        item: { name: string };
        isDM: boolean;
    }) => (
        <div>
            <h2>detail:{item.name}</h2>
            {isDM && <button>✎</button>}
        </div>
    ),
}));

afterEach(cleanup);

const spell = (i: number) =>
    ({
        id: `s${i}`,
        name: `Закляття ${i}`,
        level: 1,
        targeting: 'single',
        facetKey: 'k',
        cost: { type: 'free' },
        resolution: { kind: 'none' },
        dice: 0,
        description: null,
        effects: [],
        appearanceDescription: null,
        groupName: null,
        icon: null,
        searchText: '',
    }) as unknown as SpellForReference;

const setup = (isDM: boolean, count = 8) =>
    render(
        <InfoReferenceClient
            campaignId="c1"
            skills={[] as SkillForReference[]}
            spells={Array.from({ length: count }, (_, i) => spell(i + 1))}
            artifacts={[]}
            artifactSets={[]}
            classes={null}
            isDM={isDM}
        />
    );

describe('InfoReferenceClient', () => {
    it('renders a list and detail without accordions', () => {
        setup(false);

        expect(screen.getByText('detail:Закляття 1')).toBeTruthy();
        expect(
            document.querySelector('[data-radix-collection-item]')
        ).toBeNull();
    });

    it('caps the all view at 6 rows with a show-all button', () => {
        setup(false);

        expect(screen.queryByText('Закляття 7')).toBeNull();
        expect(screen.getByText(/Показати всі \(8\)/)).toBeTruthy();
    });

    it('hides the edit control from players', () => {
        setup(false);

        expect(screen.queryByText('✎')).toBeNull();
    });

    it('shows the edit control to the DM', () => {
        setup(true);

        expect(screen.getByText('✎')).toBeTruthy();
    });

    it('shows an empty state with reset when search finds nothing', () => {
        setup(false);

        fireEvent.change(screen.getAllByRole('searchbox')[0], {
            target: { value: 'zzzzzz' },
        });

        expect(screen.getByText('Нічого не знайдено')).toBeTruthy();
    });

    it('shows reset filters only while a search or filter is active', () => {
        setup(false);

        expect(
            screen.queryByRole('button', { name: 'Скинути фільтри' })
        ).toBeNull();

        fireEvent.change(screen.getAllByRole('searchbox')[0], {
            target: { value: 'zzzzzz' },
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Скинути фільтри' })
        );

        expect(
            screen.queryByRole('button', { name: 'Скинути фільтри' })
        ).toBeNull();
    });
});
