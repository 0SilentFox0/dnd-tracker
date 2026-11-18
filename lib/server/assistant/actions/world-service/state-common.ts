import type { AssistantCaller } from '../../types';
import { WorldOperation } from './inputs';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';
import { subtreeTargets } from '@/lib/server/world/map-handlers';
import { orphanedImagesOfSubtree } from '@/lib/server/world/map-store';
import { classesEnabled } from '@/lib/utils/characters/classes/classes-enabled';
import { parseRules } from '@/lib/utils/rules/schema';

export const getCampaignId = (caller: AssistantCaller) =>
    caller.actor.campaignId;

export type RestRules = {
    outOfCombat: ReturnType<typeof parseRules>['outOfCombat'];
    classesEnabled: boolean;
};

export type StateArgs = {
    caller: AssistantCaller;
    campaignId: string;
    operation: WorldOperation;
    input: Record<string, unknown>;
    restRules?: RestRules;
};

export type TargetsState = {
    targets: { mapIds: string[]; markerIds: string[] };
    files: string[];
};

export const byId = <T extends { id: string }>(rows: T[]) =>
    rows.sort((a, b) => a.id.localeCompare(b.id));

export const mapNotFound = () =>
    new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

export const markerNotFound = () =>
    new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

export async function subtreeState(
    campaignId: string,
    mapId: string
): Promise<TargetsState> {
    const [targets, files] = await Promise.all([
        subtreeTargets(campaignId, mapId),
        orphanedImagesOfSubtree(campaignId, mapId),
    ]);

    return {
        targets: {
            mapIds: targets.mapIds.sort(),
            markerIds: targets.markerIds.sort(),
        },
        files: files.sort(),
    };
}

export const findMap = (campaignId: string, mapId: unknown) =>
    prisma.worldMap.findFirst({ where: { id: String(mapId), campaignId } });

export async function loadRestRules(
    campaignId: string,
    operation: WorldOperation,
    input: Record<string, unknown>
): Promise<RestRules | undefined> {
    const restKind =
        operation === 'rest'
            ? input.kind
            : ['travel', 'enter', 'exit'].includes(operation)
              ? input.rest
              : 'none';

    if (restKind === 'none') return undefined;

    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { rules: true },
    });

    if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    const rules = parseRules(campaign.rules);

    return {
        outOfCombat: rules.outOfCombat,
        classesEnabled: classesEnabled(rules),
    };
}
