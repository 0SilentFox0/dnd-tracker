import type { AlertRule } from '@/lib/ops/alert-rules';

export type AlertSeverity = 'warn' | 'crit' | 'ok';
export type AlertTransition = 'up' | 'down' | 'resolved' | 'renotify';

export type AlertMessage = {
    title: string;
    body: string;
    severity: AlertSeverity;
};

function formatValue(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return 'n/a';

    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function buildAlertMessage(
    transition: AlertTransition,
    rule: AlertRule,
    value: number | null,
    status: AlertSeverity,
    limit?: number
): AlertMessage {
    const label =
        transition === 'resolved'
            ? 'RESOLVED'
            : status === 'crit'
              ? 'CRIT'
              : 'WARN';

    const prefix = transition === 'renotify' ? 'STILL ' : '';

    const lines = [
        `Rule: ${rule.id}`,
        `Value: ${formatValue(value)}${limit === undefined ? '' : ` (limit ${formatValue(limit)})`}`,
        `Status: ${status}`,
        rule.severityNote,
    ];

    return {
        title: `[${prefix}${label}] ${rule.id}`,
        body: lines.join('\n'),
        severity: transition === 'resolved' ? 'ok' : status,
    };
}
