import type { AlertRule } from '@/lib/ops/alert-rules';
import type { AlertStatus, AlertTransition } from '@/lib/utils/ops/alert-state';

export type AlertMessage = {
    title: string;
    body: string;
    severity: AlertStatus;
};

function formatValue(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return 'n/a';

    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function buildAlertMessage(
    transition: Exclude<AlertTransition, 'none'>,
    rule: AlertRule,
    value: number | null,
    status: AlertStatus,
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
