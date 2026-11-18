import { prisma } from '@/lib/db';
import { commitTravel, type DestMap } from '@/lib/server/world/travel-store';
import {
    type HeroPos,
    planTravel,
    type TravelPlan,
} from '@/lib/utils/world/travel';
import type { TravelRest } from '@/types/world';

export async function travelToPoint(args: {
    campaignId: string;
    userId: string;
    map: DestMap;
    body: {
        to: { x: number; y: number };
        toMarkerId?: string | null;
        rest: TravelRest;
    };
    characterIds: string[];
    positions: Map<string, HeroPos>;
}): Promise<TravelPlan> {
    const { campaignId, userId, map, body, characterIds, positions } = args;

    const marker = body.toMarkerId
        ? await prisma.worldMarker.findFirst({
              where: { id: body.toMarkerId, mapId: map.id },
              select: { id: true },
          })
        : null;

    const plan = planTravel({
        positions,
        characterIds,
        mapId: map.id,
        to: body.to,
        radius: map.revealRadius,
        aspect: map.width / map.height,
    });

    await commitTravel({
        campaignId,
        userId,
        dest: map,
        plan,
        positions,
        rest: body.rest,
        toMarkerId: marker?.id ?? null,
        kind: 'travel',
    });

    return plan;
}
