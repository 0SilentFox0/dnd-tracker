// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '@/components/ui/__tests__/match-media';
import { render } from '@/lib/i18n/test/render-uk';
import { CareersPage } from '@/systems/wfrp/ui/dm/CareersPage';

vi.unmock('next-intl');

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    search: '',
    remove: vi.fn(),
    confirm: vi.fn(),
    notify: vi.fn(),
}));

const tier = (name: string) => ({
    name,
    characteristics: [],
    skills: [],
    talents: [],
    trappings: [],
});

vi.mock('@/systems/wfrp/hooks/careers', () => ({
    useCareers: () => ({
        isLoading: false,
        data: [
            {
                id: 'c1',
                name: 'Воїн',
                icon: null,
                class: null,
                tiers: [tier('A'), tier('B'), tier('C'), tier('D')],
            },
        ],
    }),
    useDeleteCareer: () => ({ mutateAsync: mocks.remove }),
    useCareerForm: () => ({}),
}));
vi.mock('@/components/content-copy/ContentCopyButton', () => ({
    ContentCopyButton: () => null,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
    usePathname: () => '/campaigns/c/dm/system/careers',
    useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('@/systems/wfrp/ui/careers/CareerEditPage', () => ({
    CareerEditPage: ({ career }: { career?: { name: string } }) => (
        <p>{`editor:${career?.name ?? 'new'}`}</p>
    ),
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useConfirm: () => mocks.confirm,
    useNotify: () => mocks.notify,
}));

afterEach(() => {
    mocks.search = '';
    cleanup();
    vi.clearAllMocks();
});

describe('CareersPage', () => {
    it('lists careers with their tiers and offers create/edit/delete to the DM', () => {
        render(<CareersPage campaignId="c" />);

        expect(screen.getByText('Воїн')).toBeTruthy();
        expect(screen.getByText('A › B › C › D')).toBeTruthy();
        expect(
            screen.getByRole('button', { name: "Нова кар'єра" })
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Видалити' })).toBeTruthy();
    });

    it('hides editing in the demo', () => {
        render(<CareersPage campaignId="c" canEdit={false} />);

        expect(
            screen.queryByRole('button', { name: "Нова кар'єра" })
        ).toBeNull();
        expect(screen.queryByRole('button', { name: 'Видалити' })).toBeNull();
    });

    it('surfaces the in-use refusal from the server', async () => {
        mocks.confirm.mockResolvedValue(true);
        mocks.remove.mockRejectedValue(new Error("Кар'єру мають герої"));

        render(<CareersPage campaignId="c" />);
        fireEvent.click(screen.getByRole('button', { name: 'Видалити' }));

        await waitFor(() =>
            expect(mocks.notify).toHaveBeenCalledWith("Кар'єру мають герої")
        );
    });

    it('opens the editor through the url instead of a dialog', () => {
        render(<CareersPage campaignId="c" />);
        fireEvent.click(screen.getByRole('button', { name: "Нова кар'єра" }));

        expect(mocks.push).toHaveBeenCalledWith(
            '/campaigns/c/dm/system/careers?career=new'
        );
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders the page editor for ?career=new and for a known id', () => {
        mocks.search = 'career=new';

        const view = render(<CareersPage campaignId="c" />);

        expect(screen.getByText('editor:new')).toBeTruthy();
        view.unmount();

        mocks.search = 'career=c1';
        render(<CareersPage campaignId="c" />);

        expect(screen.getByText('editor:Воїн')).toBeTruthy();
    });
});
