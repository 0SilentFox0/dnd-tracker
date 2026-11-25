import 'server-only';
import { MINUTE_MS } from '@/lib/constants/time';
import { prisma } from '@/lib/db';
import { ALERT_RULES } from '@/lib/ops/alert-rules';
import { asStatus } from '@/lib/utils/ops/alert-state';
import type { OpsAlertsResponse } from '@/types/ops';

export async function readAlerts(limit: number): Promise<OpsAlertsResponse> {
    const [states, events] = await Promise.all([
        prisma.opsAlertState.findMany(),
        prisma.opsAlertEvent.findMany({ orderBy: { at: 'desc' }, take: limit }),
    ]);

    const byRule = new Map(states.map((s) => [s.rule, s]));

    return {
        rules: ALERT_RULES.map((rule) => {
            const s = byRule.get(rule.id);

            return {
                id: rule.id,
                note: rule.severityNote,
                status: s ? asStatus(s.status) : 'ok',
                since: s?.since.toISOString() ?? null,
                lastValue: s?.lastValue ?? null,
                silencedUntil: s?.silencedUntil?.toISOString() ?? null,
                warn: rule.warn ?? null,
                crit: rule.crit ?? null,
            };
        }),
        events: events.map((e) => ({
            id: e.id,
            rule: e.rule,
            from: asStatus(e.from),
            to: asStatus(e.to),
            value: e.value,
            at: e.at.toISOString(),
            notified: e.notified,
        })),
    };
}

export async function muteAlert(
    rule: string,
    minutes: number,
    now: Date = new Date()
): Promise<{ silencedUntil: string | null } | null> {
    if (!ALERT_RULES.some((r) => r.id === rule)) return null;

    const silencedUntil = minutes
        ? new Date(now.getTime() + minutes * MINUTE_MS)
        : null;

    await prisma.opsAlertState.upsert({
        where: { rule },
        create: { rule, silencedUntil },
        update: { silencedUntil },
    });

    return { silencedUntil: silencedUntil?.toISOString() ?? null };
}
