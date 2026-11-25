// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AlertList } from '../AlertList';
import { DbTopTable } from '../DbTopTable';
import { LimitGauge } from '../LimitGauge';
import { OpsStatusGrid } from '../OpsStatusGrid';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { OpsAlertsResponse, OpsLimitRow, OpsSummary } from '@/types/ops';

vi.unmock('next-intl');

const opts = { locale: 'en', namespaces: ['common', 'ops'] } as const;

const row = (patch: Partial<OpsLimitRow> = {}): OpsLimitRow => ({
    id: 'provider.pusher.connections',
    provider: 'pusher',
    metric: 'provider.pusher.connections',
    unit: 'count',
    period: 'now',
    value: 80,
    limit: 100,
    percent: 0.8,
    status: 'warn',
    forecastHours: 3.5,
    ...patch,
});

afterEach(cleanup);

describe('LimitGauge', () => {
    it('shows percent, usage and forecast', async () => {
        await renderWithIntl(<LimitGauge row={row()} />, opts);

        expect(screen.getByText('80%')).toBeTruthy();
        expect(screen.getByText('80 of 100')).toBeTruthy();
        expect(screen.getByText('Limit reached in about 3.5 h')).toBeTruthy();
        expect(
            screen.getByRole('progressbar').getAttribute('aria-valuenow')
        ).toBe('80');
    });

    it('shows n/a for a null limit', async () => {
        await renderWithIntl(
            <LimitGauge
                row={row({ limit: null, percent: null, status: null })}
            />,
            opts
        );

        expect(screen.getByText('n/a')).toBeTruthy();
        expect(screen.queryByRole('progressbar')).toBeNull();
    });
});

describe('AlertList', () => {
    const alerts: OpsAlertsResponse = {
        rules: [
            {
                id: 'db.size',
                note: 'DB is big',
                status: 'crit',
                since: null,
                lastValue: 1,
                silencedUntil: null,
                warn: 0.7,
                crit: 0.9,
            },
            {
                id: 'api.5xx',
                note: 'x',
                status: 'ok',
                since: null,
                lastValue: null,
                silencedUntil: null,
                warn: 10,
                crit: 50,
            },
        ],
        events: [],
    };

    it('lists only active rules and reports a mute click', async () => {
        const onMute = vi.fn();

        await renderWithIntl(
            <AlertList alerts={alerts} onMute={onMute} />,
            opts
        );

        expect(screen.getByText('DB is big')).toBeTruthy();
        expect(screen.queryByText('api.5xx')).toBeNull();

        fireEvent.click(screen.getByText('Mute 1 h'));

        expect(onMute).toHaveBeenCalledWith('db.size', 60);
    });

    it('shows empty states', async () => {
        await renderWithIntl(
            <AlertList alerts={{ rules: [], events: [] }} onMute={vi.fn()} />,
            opts
        );

        expect(screen.getByText('No active alerts')).toBeTruthy();
        expect(screen.getByText('No status changes yet')).toBeTruthy();
    });
});

describe('OpsStatusGrid', () => {
    const summary = (age: number | null): OpsSummary => ({
        generatedAt: '2026-11-24T00:00:00Z',
        heartbeatAgeSec: age,
        providers: [
            { name: 'pusher', tier: 'free', available: false, status: null },
        ],
        limits: [],
        activeAlerts: [],
    });

    it('warns when the collector is silent and links to the provider dashboard', async () => {
        await renderWithIntl(<OpsStatusGrid summary={summary(600)} />, opts);

        expect(screen.getByRole('alert')).toBeTruthy();
        expect(screen.getByText('Open provider dashboard')).toBeTruthy();
    });

    it('has no warning for a fresh heartbeat', async () => {
        await renderWithIntl(<OpsStatusGrid summary={summary(20)} />, opts);

        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByText('Last collection 20 s ago')).toBeTruthy();
    });
});

describe('DbTopTable', () => {
    it('explains a missing pg_stat_statements', async () => {
        await renderWithIntl(
            <DbTopTable data={{ available: false, rows: [], longTx: [] }} />,
            opts
        );

        expect(
            screen.getByText(/pg_stat_statements is not available/)
        ).toBeTruthy();
        expect(screen.getByText('No long transactions')).toBeTruthy();
    });
});
