import type { ActionPreview, AssistantCaller, TargetRef } from '../../types';
import { parsedInput, WorldOperation } from './inputs';
import { worldState } from './state';
import { getCampaignId } from './state-common';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { isDemoKind } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';
import type { CampaignAccessResult } from '@/lib/utils/api/api-auth';
import { requestDigest } from '@/lib/utils/battle/store/stable-json';
import { jsonContent } from '@/lib/utils/common/json';
import { parseRules } from '@/lib/utils/rules/schema';

export async function requireOwnedMap(campaignId: string, mapId: string) {
    const map = await prisma.worldMap.findFirst({
        where: { id: mapId, campaignId },
    });

    if (!map) throw new ContentError(API_ERRORS.WORLD_MAP_NOT_FOUND, 404);

    return map;
}

export async function requireOwnedMarker(campaignId: string, markerId: string) {
    const marker = await prisma.worldMarker.findFirst({
        where: { id: markerId, map: { campaignId } },
        include: {
            map: { select: { campaignId: true } },
            childMap: { select: { id: true } },
        },
    });

    if (!marker) throw new ContentError(API_ERRORS.WORLD_MARKER_NOT_FOUND, 404);

    return marker;
}

export async function dmAccess(
    caller: AssistantCaller
): Promise<CampaignAccessResult> {
    const campaignId = getCampaignId(caller);

    const row = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
            id: true,
            kind: true,
            maxLevel: true,
            rules: true,
            allowPlayerEdit: true,
            members: {
                where: { userId: caller.actor.userId },
                select: { userId: true, role: true },
            },
        },
    });

    if (!row) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    return {
        userId: caller.actor.userId,
        isDM: true,
        isDemo: isDemoKind(row.kind),
        campaign: { ...row, rules: parseRules(row.rules) },
    };
}

export async function prepareWorldAction(
    caller: AssistantCaller,
    operation: WorldOperation,
    raw: unknown
): Promise<ActionPreview> {
    const input = parsedInput(operation, raw);

    const current = await worldState(caller, operation, input);

    const mapTarget: TargetRef = {
        domain: 'world-map',
        id: String(input.mapId ?? 'new'),
        name: String(
            (current as { name?: string } | null)?.name ?? 'World map'
        ),
    };

    const target: TargetRef = operation.startsWith('markers.')
        ? {
              domain: 'world-marker',
              id: String(input.markerId ?? 'new'),
              name: String(
                  (current as { name?: string } | null)?.name ?? 'World marker'
              ),
          }
        : operation.startsWith('notes.')
          ? {
                domain: 'world-note',
                id: String(input.noteId ?? 'new'),
                name: 'World note',
            }
          : mapTarget;

    return {
        summary: `World map: ${operation}`,
        targets: [target],
        changes: [
            {
                target,
                path: operation,
                before: jsonContent(current ?? null),
                after: jsonContent(input),
            },
        ],
        warnings: ['World changes may affect the shared campaign map.'],
        preconditions: { fingerprint: requestDigest(current) },
        effects: [
            {
                kind: operation.endsWith('delete')
                    ? 'delete'
                    : operation.endsWith('create')
                      ? 'create'
                      : 'update',
                targets: [target],
                description: `World map: ${operation}`,
            },
        ],
    };
}
