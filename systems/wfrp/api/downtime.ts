import { campaignPost, campaignPut } from '@/lib/api/client';
import { systemPath } from '@/lib/api/system';
import type {
    DowntimePeriodBody,
    DowntimePeriodResult,
    DowntimePeriodUndoBody,
    DowntimeSetBody,
    DowntimeSetResult,
} from '@/systems/wfrp/rules/downtime/api-types';

export const putDowntime = (
    campaignId: string,
    characterId: string,
    body: DowntimeSetBody
) =>
    campaignPut<DowntimeSetResult>(
        campaignId,
        systemPath.character(characterId, 'downtime'),
        body
    );

export const postDowntimePeriod = (
    campaignId: string,
    body: DowntimePeriodBody
) =>
    campaignPost<DowntimePeriodResult>(
        campaignId,
        systemPath.campaign('downtime.period'),
        body
    );

export const postDowntimePeriodUndo = (
    campaignId: string,
    body: DowntimePeriodUndoBody
) =>
    campaignPost<DowntimePeriodResult>(
        campaignId,
        systemPath.campaign('downtime.period-undo'),
        body
    );
