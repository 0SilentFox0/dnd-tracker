import { MINUTE_MS } from '@/lib/constants/time';
import type { AlertRule } from '@/lib/ops/alert-rules';

export type AlertStatus = 'ok' | 'warn' | 'crit';
export type AlertTransition = 'none' | 'up' | 'down' | 'resolved' | 'renotify';

export interface AlertStateRow {
    status: AlertStatus;
    since: Date;
    breachSince: Date | null;
    lastValue: number | null;
    lastNotifiedAt: Date | null;
    lastNotifiedStatus: AlertStatus | null;
    silencedUntil: Date | null;
}

const RANK: Record<AlertStatus, number> = { ok: 0, warn: 1, crit: 2 };

function breached(rule: AlertRule, value: number, threshold?: number): boolean {
    if (threshold === undefined) return false;

    return rule.direction === 'below' ? value <= threshold : value >= threshold;
}

export function targetStatus(
    rule: AlertRule,
    value: number | null
): AlertStatus {
    if (value === null || Number.isNaN(value)) return 'ok';

    if (breached(rule, value, rule.crit)) return 'crit';

    if (breached(rule, value, rule.warn)) return 'warn';

    return 'ok';
}

/** Caller sends when `notify` and must set lastNotifiedAt/Status on the returned state only if a channel delivered. */
export function nextAlertState(
    prev: AlertStateRow | null,
    value: number | null,
    rule: AlertRule,
    now: Date
): { state: AlertStateRow; transition: AlertTransition; notify: boolean } {
    const before: AlertStateRow = prev ?? {
        status: 'ok',
        since: now,
        breachSince: null,
        lastValue: null,
        lastNotifiedAt: null,
        lastNotifiedStatus: null,
        silencedUntil: null,
    };

    const target = targetStatus(rule, value);

    let status = before.status;

    let breachSince: Date | null = null;

    if (target === 'ok' || RANK[target] < RANK[before.status]) {
        status = target;
        breachSince = target === 'ok' ? null : before.breachSince;
    } else {
        breachSince = before.breachSince ?? now;

        const heldMs = now.getTime() - breachSince.getTime();

        if (
            RANK[target] > RANK[before.status] &&
            heldMs >= rule.forMinutes * MINUTE_MS
        ) {
            status = target;
        }
    }

    const state: AlertStateRow = {
        ...before,
        status,
        since: status === before.status ? before.since : now,
        breachSince,
        lastValue: value,
    };

    const silenced = !!before.silencedUntil && before.silencedUntil > now;

    const notified = before.lastNotifiedStatus ?? 'ok';

    const changeTransition = (from: AlertStatus): AlertTransition =>
        status === from
            ? 'none'
            : status === 'ok'
              ? 'resolved'
              : RANK[status] > RANK[from]
                ? 'up'
                : 'down';

    if (silenced) {
        return {
            state,
            transition: changeTransition(before.status),
            notify: false,
        };
    }

    if (status !== notified) {
        return { state, transition: changeTransition(notified), notify: true };
    }

    const cooled =
        !before.lastNotifiedAt ||
        now.getTime() - before.lastNotifiedAt.getTime() >=
            rule.cooldownMinutes * MINUTE_MS;

    if (status === 'crit' && cooled) {
        return { state, transition: 'renotify', notify: true };
    }

    return {
        state,
        transition: changeTransition(before.status),
        notify: false,
    };
}
