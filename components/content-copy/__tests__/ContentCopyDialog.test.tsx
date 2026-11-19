// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContentCopyButton } from '../ContentCopyButton';
import { ContentCopyDialog } from '../ContentCopyDialog';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { CopyResult } from '@/types/content-copy';

const mocks = vi.hoisted(() => ({
    options: { data: undefined as unknown },
    preview: vi.fn(),
    run: vi.fn(),
    previewState: { data: undefined as unknown },
    runState: { data: undefined as unknown },
}));

vi.mock('next/dynamic', () => ({
    default: () => (props: { open: boolean }) =>
        props.open ? <p>DIALOG</p> : null,
}));

vi.mock('@/lib/hooks/content-copy', () => ({
    useContentCopyOptions: () => mocks.options,
    useContentCopyCampaigns: () => ({
        data: mocks.options.data
            ? {
                  campaigns: (
                      mocks.options.data as { campaigns: unknown[] }
                  ).campaigns,
              }
            : undefined,
    }),
    useContentCopy: () => ({
        preview: {
            mutate: mocks.preview,
            reset: vi.fn(),
            isPending: false,
            error: null,
            get data() {
                return mocks.previewState.data;
            },
        },
        run: {
            mutate: mocks.run,
            reset: vi.fn(),
            isPending: false,
            error: null,
            get data() {
                return mocks.runState.data;
            },
        },
    }),
}));

vi.unmock('next-intl');
afterEach(cleanup);

const NAMESPACES = ['common', 'validation', 'contentCopy'] as const;

const OPTIONS = {
    data: {
        items: [
            { id: 'u1', name: 'Goblin' },
            { id: 'u2', name: 'Orc' },
        ],
        campaigns: [
            { id: 'c2', name: 'Alpha' },
            { id: 'c3', name: 'Beta' },
        ],
    },
};

const REPORT: CopyResult = {
    targets: [
        {
            campaignId: 'c2',
            name: 'Alpha',
            status: 'ok',
            created: [{ kind: 'units', id: 'n1', name: 'Goblin' }],
            reused: [],
            skipped: [{ kind: 'units', name: 'Orc', reason: 'exists' }],
            warnings: [],
        },
    ],
};

const renderDialog = () =>
    renderWithIntl(
        <ContentCopyDialog
            campaignId="c1"
            kind="units"
            open
            onOpenChange={() => {}}
        />,
        { namespaces: NAMESPACES }
    );

beforeEach(() => {
    mocks.options = OPTIONS;
    mocks.previewState.data = undefined;
    mocks.runState.data = undefined;
    mocks.preview.mockReset();
    mocks.run.mockReset();
});

describe('ContentCopyDialog', () => {
    it('Далі заблоковано без вибору', async () => {
        await renderDialog();

        const next = screen.getByRole('button', { name: 'Далі' });

        expect((next as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getByRole('checkbox', { name: 'Goblin' }));

        expect((next as HTMLButtonElement).disabled).toBe(true);
    });

    it('«Усі кампанії» вимикає окремі чекбокси й шле all: true', async () => {
        await renderDialog();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Goblin' }));
        fireEvent.click(
            screen.getByRole('checkbox', { name: 'Усі мої кампанії' })
        );

        expect(
            (
                screen.getByRole('checkbox', {
                    name: 'Alpha',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Далі' }));

        expect(mocks.preview).toHaveBeenCalledWith({
            items: [{ kind: 'units', ids: ['u1'] }],
            targets: { all: true },
        });
    });

    it('після запуску показує звіт по кожній кампанії', async () => {
        await renderDialog();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Goblin' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha' }));
        mocks.previewState.data = REPORT;
        mocks.runState.data = REPORT;

        fireEvent.click(screen.getByRole('button', { name: 'Далі' }));

        fireEvent.click(screen.getByRole('button', { name: 'Копіювати' }));

        expect(mocks.run).toHaveBeenCalledWith({
            items: [{ kind: 'units', ids: ['u1'] }],
            targets: { campaignIds: ['c2'] },
        });

        expect(screen.getByText('Alpha')).toBeTruthy();
        expect(screen.getByText('Скопійовано')).toBeTruthy();
        expect(screen.getByText(/Orc: уже існує/)).toBeTruthy();
    });
});

describe('ContentCopyButton', () => {
    it('без інших кампаній кнопки немає', async () => {
        mocks.options = { data: { items: [], campaigns: [] } };

        await renderWithIntl(
            <ContentCopyButton campaignId="c1" kind="units" />,
            { namespaces: NAMESPACES }
        );

        expect(screen.queryByRole('button')).toBeNull();
    });

    it('з кампаніями показує кнопку й відкриває діалог', async () => {
        await renderWithIntl(
            <ContentCopyButton campaignId="c1" kind="units" />,
            { namespaces: NAMESPACES }
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Копіювати в кампанії…' })
        );

        await waitFor(() => expect(screen.getByText('DIALOG')).toBeTruthy());
    });
});
