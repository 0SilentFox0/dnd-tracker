import { request } from './client';

import type {
    OpsAlertsResponse,
    OpsDbTop,
    OpsMuteMinutes,
    OpsNotifyResult,
    OpsRange,
    OpsSeriesResponse,
    OpsSummary,
} from '@/types/ops';

export const getOpsSummary = () => request<OpsSummary>('/api/ops/summary');

export const getOpsSeries = (range: OpsRange, metrics: string[]) =>
    request<OpsSeriesResponse>(
        `/api/ops/series?range=${range}&metrics=${encodeURIComponent(metrics.join(','))}`
    );

export const getOpsAlerts = () => request<OpsAlertsResponse>('/api/ops/alerts');

export const getOpsDbTop = () => request<OpsDbTop>('/api/ops/db-top');

export const muteOpsAlert = (rule: string, minutes: OpsMuteMinutes) =>
    request<{ silencedUntil: string | null }>(
        `/api/ops/alerts/${encodeURIComponent(rule)}/mute`,
        { method: 'POST', body: JSON.stringify({ minutes }) }
    );

export const sendOpsTestNotify = () =>
    request<OpsNotifyResult>('/api/ops/test-notify', { method: 'POST' });
