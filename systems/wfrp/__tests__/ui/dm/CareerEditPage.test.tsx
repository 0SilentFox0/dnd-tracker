// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '@/components/ui/__tests__/match-media';
import { render } from '@/lib/i18n/test/render-uk';
import { CareerEditPage } from '@/systems/wfrp/ui/careers/CareerEditPage';

vi.unmock('next-intl');

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    remove: vi.fn(),
    confirm: vi.fn(),
    notify: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
}));
vi.mock('@/systems/wfrp/hooks/careers', () => ({
    useDeleteCareer: () => ({ mutateAsync: mocks.remove }),
}));
vi.mock('@/systems/wfrp/ui/careers/CareerForm', () => ({
    CareerForm: () => <form id="career-form" />,
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useConfirm: () => mocks.confirm,
    useNotify: () => mocks.notify,
}));

const career = {
    id: 'c1',
    name: 'Воїн',
    icon: null,
    class: null,
    tiers: [],
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('CareerEditPage', () => {
    it('binds the single save button to the form id and offers no delete for a new career', () => {
        render(<CareerEditPage campaignId="c" listHref="/list" />);

        expect(document.querySelector('.hud-form-side')).toBeNull();

        const save = screen.getByRole('button', { name: 'Зберегти' });

        expect(save).toHaveAttribute('form', 'career-form');
        expect(
            screen.getAllByRole('button', { name: 'Зберегти' })
        ).toHaveLength(1);
        expect(screen.queryByRole('button', { name: 'Більше дій' })).toBeNull();
    });

    it('deletes through the menu after confirmation and returns to the list', async () => {
        mocks.confirm.mockResolvedValue(true);
        mocks.remove.mockResolvedValue(undefined);

        render(
            <CareerEditPage campaignId="c" career={career} listHref="/list" />
        );

        const trigger = screen.getByRole('button', { name: 'Більше дій' });

        fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Видалити' })
        );

        await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('c1'));
        expect(mocks.confirm).toHaveBeenCalledTimes(1);
        expect(mocks.push).toHaveBeenCalledWith('/list');
    });
});
