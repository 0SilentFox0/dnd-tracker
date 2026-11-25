import { describe, expect, it } from 'vitest';

import type { AlertRule } from '@/lib/ops/alert-rules';
import {
    type AlertStateRow,
    nextAlertState,
} from '@/lib/utils/ops/alert-state';

const rule: AlertRule = {
    id: 'r',
    metric: 'api.error5xx',
    window: '5m',
    agg: 'sum',
    warn: 10,
    crit: 50,
    forMinutes: 2,
    cooldownMinutes: 30,
    severityNote: 'x',
};

const t0 = new Date('2026-01-01T00:00:00Z');

const at = (min: number) => new Date(t0.getTime() + min * 60_000);

const base: AlertStateRow = {
    status: 'ok',
    since: t0,
    breachSince: null,
    lastValue: null,
    lastNotifiedAt: null,
    lastNotifiedStatus: null,
    silencedUntil: null,
};

describe('nextAlertState', () => {
    it('holds ok until forMinutes elapsed, then goes up and notifies', () => {
        const first = nextAlertState(null, 20, rule, at(0));

        expect(first.state.status).toBe('ok');
        expect(first.notify).toBe(false);

        const second = nextAlertState(first.state, 20, rule, at(2));

        expect(second.state.status).toBe('warn');
        expect(second.transition).toBe('up');
        expect(second.notify).toBe(true);
    });

    it('goes warn to crit', () => {
        const warn = {
            ...base,
            status: 'warn' as const,
            breachSince: t0,
            lastNotifiedStatus: 'warn' as const,
            lastNotifiedAt: t0,
        };

        const res = nextAlertState(warn, 60, rule, at(3));

        expect(res.state.status).toBe('crit');
        expect(res.transition).toBe('up');
        expect(res.notify).toBe(true);
    });

    it('resolves back to ok when previously notified', () => {
        const crit = {
            ...base,
            status: 'crit' as const,
            breachSince: t0,
            lastNotifiedStatus: 'crit' as const,
            lastNotifiedAt: t0,
        };

        const res = nextAlertState(crit, 0, rule, at(5));

        expect(res.state.status).toBe('ok');
        expect(res.state.breachSince).toBeNull();
        expect(res.transition).toBe('resolved');
        expect(res.notify).toBe(true);
    });

    it('does not announce resolution that was never announced', () => {
        const warn = { ...base, status: 'warn' as const, breachSince: t0 };

        const res = nextAlertState(warn, 0, rule, at(5));

        expect(res.state.status).toBe('ok');
        expect(res.notify).toBe(false);
    });

    it('renotifies crit only after the cooldown', () => {
        const crit = {
            ...base,
            status: 'crit' as const,
            breachSince: t0,
            lastNotifiedStatus: 'crit' as const,
            lastNotifiedAt: t0,
        };

        expect(nextAlertState(crit, 60, rule, at(10)).notify).toBe(false);

        const res = nextAlertState(crit, 60, rule, at(30));

        expect(res.transition).toBe('renotify');
        expect(res.notify).toBe(true);
    });

    it('silence suppresses notify but state still moves', () => {
        const silenced = { ...base, breachSince: t0, silencedUntil: at(60) };

        const res = nextAlertState(silenced, 60, rule, at(5));

        expect(res.state.status).toBe('crit');
        expect(res.notify).toBe(false);
    });

    it('retries until the caller records a delivery', () => {
        const warn = {
            ...base,
            status: 'warn' as const,
            breachSince: t0,
            lastNotifiedStatus: null,
            lastNotifiedAt: null,
        };

        const retry = nextAlertState(warn, 20, rule, at(5));

        expect(retry.notify).toBe(true);
        expect(retry.transition).toBe('up');
        expect(retry.state.lastNotifiedAt).toBeNull();
    });

    it('supports inverted thresholds (below)', () => {
        const expiry: AlertRule = {
            ...rule,
            direction: 'below',
            warn: 14,
            crit: 3,
            forMinutes: 0,
        };

        expect(nextAlertState(null, 10, expiry, t0).state.status).toBe('warn');
        expect(nextAlertState(null, 2, expiry, t0).state.status).toBe('crit');
        expect(nextAlertState(null, 30, expiry, t0).state.status).toBe('ok');
    });

    it('treats a missing value as ok', () => {
        expect(nextAlertState(null, null, rule, t0).state.status).toBe('ok');
    });
});
