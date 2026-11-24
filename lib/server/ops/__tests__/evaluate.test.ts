import { beforeEach, describe, expect, it, vi } from 'vitest';

const { aggregate, groupBy, findMany, upsert, create, sendAlert } = vi.hoisted(
    () => ({
        aggregate: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
        sendAlert: vi.fn(),
    })
);

vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: (ops: unknown[]) => Promise.all(ops),
        opsMetricBucket: { aggregate, groupBy },
        opsAlertState: { findMany, upsert },
        opsAlertEvent: { create },
    },
}));
vi.mock('@/lib/server/ops/notify', () => ({ sendAlert }));

import { evaluateAlerts, readRuleValue } from '../evaluate';

import { ALERT_RULES } from '@/lib/ops/alert-rules';

const now = new Date('2026-03-10T12:00:00Z');

const rule = (id: string) => {
    const found = ALERT_RULES.find((r) => r.id === id);

    if (!found) throw new Error(`Unknown rule: ${id}`);

    return found;
};

beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
    aggregate.mockResolvedValue({
        _sum: { n: 0, sum: 0 },
        _max: { max: null },
    });
    groupBy.mockResolvedValue([]);
    sendAlert.mockResolvedValue({ telegram: 'off', email: 'off' });
});

describe('readRuleValue', () => {
    it('divides by the per metric', async () => {
        aggregate
            .mockResolvedValueOnce({ _sum: { n: 1, sum: 3 }, _max: { max: 3 } })
            .mockResolvedValueOnce({
                _sum: { n: 1, sum: 30 },
                _max: { max: 30 },
            });

        const { value } = await readRuleValue(
            rule('battle.conflict_rate'),
            now
        );

        expect(value).toBeCloseTo(0.1);
    });

    it('computes p95 from le buckets', async () => {
        groupBy.mockResolvedValue([
            { labels: 'le=50', _sum: { sum: 90 } },
            { labels: 'op=x,le=100', _sum: { sum: 10 } },
        ]);

        const { value } = await readRuleValue(rule('battle.p95'), now);

        expect(value).toBeGreaterThan(50);
        expect(value).toBeLessThanOrEqual(100);
    });

    it('returns days for secret expiry', async () => {
        const { value } = await readRuleValue(rule('secrets.expiry'), now);

        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(365);
    });
});

describe('evaluateAlerts', () => {
    it('records an event, keeps lastNotifiedAt unset when no channel is configured', async () => {
        aggregate.mockImplementation(async ({ where }) =>
            where.metric === 'api.error5xx'
                ? { _sum: { n: 1, sum: 100 }, _max: { max: 100 } }
                : { _sum: { n: 0, sum: 0 }, _max: { max: null } }
        );

        const res = await evaluateAlerts(now);

        expect(res.notified).toBe(0);
        expect(sendAlert).toHaveBeenCalled();

        const event = create.mock.calls.find(
            (c) => c[0].data.rule === 'api.5xx'
        );

        expect(event?.[0].data).toMatchObject({ to: 'crit', notified: false });

        const state = upsert.mock.calls.find(
            (c) => c[0].where.rule === 'api.5xx'
        );

        expect(state?.[0].update.lastNotifiedAt).toBeNull();
        expect(state?.[0].update.status).toBe('crit');
    });

    it('updates lastNotifiedAt when a channel delivers', async () => {
        sendAlert.mockResolvedValue({ telegram: 'ok', email: 'off' });
        aggregate.mockImplementation(async ({ where }) =>
            where.metric === 'api.error5xx'
                ? { _sum: { n: 1, sum: 100 }, _max: { max: 100 } }
                : { _sum: { n: 0, sum: 0 }, _max: { max: null } }
        );

        await evaluateAlerts(now);

        const state = upsert.mock.calls.find(
            (c) => c[0].where.rule === 'api.5xx'
        );

        expect(state?.[0].update.lastNotifiedAt).toEqual(now);
        expect(state?.[0].update.lastNotifiedStatus).toBe('crit');
    });

    it('does not send when nothing is breached', async () => {
        await evaluateAlerts(now);

        expect(sendAlert).not.toHaveBeenCalled();
    });
});
