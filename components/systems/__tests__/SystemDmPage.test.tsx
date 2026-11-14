// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    systemUiOf: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/components/systems', () => ({ systemUiOf: mocks.systemUiOf }));

import { SystemDmPage } from '../SystemDmPage';

import type { DmPageProps } from '@/components/systems/types';

const page = (section: string) => (
    <SystemDmPage
        campaignId="c"
        section={section}
        system={{ key: 'dnd5e' }}
        canEdit
        view={{ type: 'edit', id: 'x' }}
        data="payload"
    />
);

describe('SystemDmPage', () => {
    afterEach(cleanup);

    it('is not found for a section outside the composition', () => {
        mocks.systemUiOf.mockReturnValue({ dmPages: { careers: () => null } });

        expect(() => render(page('classes'))).toThrow('NEXT_NOT_FOUND');
    });

    it('is not found when the composition has no dmPages', () => {
        mocks.systemUiOf.mockReturnValue({});

        expect(() => render(page('classes'))).toThrow('NEXT_NOT_FOUND');
    });

    it('forwards view and data to the section page', () => {
        const Page = ({ view, data }: DmPageProps) => (
            <p>{`${view?.type}:${String(data)}`}</p>
        );

        mocks.systemUiOf.mockReturnValue({ dmPages: { classes: Page } });

        render(page('classes'));

        expect(screen.getByText('edit:payload')).toBeTruthy();
    });
});
