import type { ProviderName } from '@/lib/ops/metrics-catalog';
import type { AlertStatus } from '@/lib/utils/ops/alert-state';

export type OpsRange = '1h' | '6h' | '24h' | '7d';

export type OpsMuteMinutes = 0 | 60 | 1440;

export interface OpsSeriesPoint {
    t: number;
    v: number | null;
}

export interface OpsSeriesResponse {
    range: OpsRange;
    stepMs: number;
    series: Record<string, OpsSeriesPoint[]>;
}

export interface OpsLimitRow {
    id: string;
    provider: string;
    metric: string;
    unit: 'count' | 'bytes';
    period: 'now' | 'day' | 'month';
    value: number | null;
    limit: number | null;
    percent: number | null;
    status: AlertStatus | null;
    forecastHours: number | null;
}

export interface OpsProviderRow {
    name: ProviderName;
    tier: 'free' | 'paid';
    available: boolean;
    status: AlertStatus | null;
}

export interface OpsActiveAlert {
    rule: string;
    status: AlertStatus;
    since: string;
    lastValue: number | null;
    silencedUntil: string | null;
}

export interface OpsSummary {
    generatedAt: string;
    heartbeatAgeSec: number | null;
    providers: OpsProviderRow[];
    limits: OpsLimitRow[];
    activeAlerts: OpsActiveAlert[];
}

export interface OpsAlertRuleState {
    id: string;
    note: string;
    status: AlertStatus;
    since: string | null;
    lastValue: number | null;
    silencedUntil: string | null;
    warn: number | null;
    crit: number | null;
}

export interface OpsAlertEventRow {
    id: string;
    rule: string;
    from: AlertStatus;
    to: AlertStatus;
    value: number | null;
    at: string;
    notified: boolean;
}

export interface OpsAlertsResponse {
    rules: OpsAlertRuleState[];
    events: OpsAlertEventRow[];
}

export interface OpsDbTopRow {
    query: string;
    calls: number;
    totalMs: number;
    meanMs: number;
}

export interface OpsLongTx {
    seconds: number;
    state: string;
    waitEventType: string | null;
}

export interface OpsDbTop {
    available: boolean;
    rows: OpsDbTopRow[];
    longTx: OpsLongTx[];
}

export interface OpsNotifyResult {
    telegram: 'ok' | 'fail' | 'off';
    email: 'ok' | 'fail' | 'off';
}
