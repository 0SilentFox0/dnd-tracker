import { describe, expect, it } from 'vitest';

import type { AlertRule } from '@/lib/ops/alert-rules';
import { buildAlertMessage } from '@/lib/utils/ops/alert-message';

const rule = {
    id: 'db.connections',
    severityNote: 'Pool is close to exhaustion',
} as AlertRule;

describe('buildAlertMessage', () => {
    it('formats an upward transition', () => {
        const msg = buildAlertMessage('up', rule, 0.92, 'crit', 0.9);

        expect(msg.severity).toBe('crit');
        expect(msg.title).toBe('[CRIT] db.connections');
        expect(msg.body).toContain('Value: 0.92 (limit 0.90)');
        expect(msg.body).toContain('Pool is close to exhaustion');
    });

    it('formats a downward transition as warn', () => {
        const msg = buildAlertMessage('down', rule, 5, 'warn');

        expect(msg.severity).toBe('warn');
        expect(msg.title).toBe('[WARN] db.connections');
        expect(msg.body).toContain('Value: 5\n');
    });

    it('formats resolved as ok severity', () => {
        const msg = buildAlertMessage('resolved', rule, null, 'ok');

        expect(msg.severity).toBe('ok');
        expect(msg.title).toBe('[RESOLVED] db.connections');
        expect(msg.body).toContain('Value: n/a');
    });

    it('marks renotify', () => {
        expect(buildAlertMessage('renotify', rule, 1, 'crit').title).toBe(
            '[STILL CRIT] db.connections'
        );
    });

    it('is latin-only', () => {
        const msg = buildAlertMessage('up', rule, 1, 'warn', 2);

        expect(/^[\x20-\x7e\n]*$/.test(msg.title + msg.body)).toBe(true);
    });
});
