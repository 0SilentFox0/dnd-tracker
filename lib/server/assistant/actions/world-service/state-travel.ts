import {
    byId,
    findMap,
    mapNotFound,
    markerNotFound,
    RestRules,
    StateArgs,
} from './state-common';

import 'server-only';
import { prisma } from '@/lib/db';
import {
    activePlayerHeroes,
    readPositions,
} from '@/lib/server/world/travel-store';

const withRestRules = (restRules: RestRules | undefined) =>
    restRules ? { restRules } : {};

const loadRestCharacters = (
    campaignId: string,
    ids: string[],
    needed: boolean
) =>
    needed
        ? prisma.character.findMany({
              where: { id: { in: ids }, campaignId },
              select: { id: true, resources: true, classes: true },
          })
        : [];

const loadReveals = (mapId: string, ids: string[]) =>
    prisma.worldReveal.findMany({
        where: { mapId, characterId: { in: ids } },
        select: { id: true, characterId: true, shape: true },
    });

export async function travelState({ campaignId, input, restRules }: StateArgs) {
    const ids = input.characterIds as string[];

    const [map, heroes, positions] = await Promise.all([
        findMap(campaignId, input.mapId),
        activePlayerHeroes(campaignId, { id: { in: ids } }),
        readPositions(ids),
    ]);

    if (!map) throw mapNotFound();

    const [marker, reveals, characters] = await Promise.all([
        input.toMarkerId
            ? prisma.worldMarker.findFirst({
                  where: { id: String(input.toMarkerId), mapId: map.id },
                  select: { id: true },
              })
            : null,
        loadReveals(map.id, ids),
        loadRestCharacters(campaignId, ids, input.rest !== 'none'),
    ]);

    return {
        map,
        marker,
        heroes: byId(heroes),
        positions: [...positions].sort(([a], [b]) => a.localeCompare(b)),
        reveals: byId(reveals),
        characters: byId(characters),
        ...withRestRules(restRules),
    };
}

async function mapTransitionState(
    campaignId: string,
    input: Record<string, unknown>,
    destMapId: string | undefined
) {
    const ids = input.characterIds as string[];

    const heroes = await activePlayerHeroes(campaignId, { id: { in: ids } });

    const positions = await readPositions(ids);

    const [reveals, characters] = destMapId
        ? await Promise.all([
              loadReveals(destMapId, ids),
              loadRestCharacters(campaignId, ids, input.rest !== 'none'),
          ])
        : [[], []];

    return {
        heroes: byId(heroes),
        positions: [...positions].sort(([a], [b]) => a.localeCompare(b)),
        reveals: byId(reveals),
        characters: byId(characters),
    };
}

export async function enterState({ campaignId, input, restRules }: StateArgs) {
    const marker = await prisma.worldMarker.findFirst({
        where: { id: String(input.markerId), map: { campaignId } },
        include: { childMap: true },
    });

    if (!marker) throw markerNotFound();

    const state = await mapTransitionState(
        campaignId,
        input,
        marker.childMap?.id
    );

    return { marker, ...state, ...withRestRules(restRules) };
}

export async function exitState({ campaignId, input, restRules }: StateArgs) {
    const map = await prisma.worldMap.findFirst({
        where: { id: String(input.mapId), campaignId },
        include: { parentMarker: true },
    });

    if (!map) throw mapNotFound();

    const state = await mapTransitionState(
        campaignId,
        input,
        map.parentMarker?.mapId
    );

    return { map, ...state, ...withRestRules(restRules) };
}

export async function restState({ campaignId, input, restRules }: StateArgs) {
    const ids = input.characterIds as string[];

    const [map, heroes, positions] = await Promise.all([
        findMap(campaignId, input.mapId),
        activePlayerHeroes(campaignId, { id: { in: ids } }),
        readPositions(ids),
    ]);

    if (!map) throw mapNotFound();

    const characters = await loadRestCharacters(campaignId, ids, true);

    return {
        map,
        heroes: byId(heroes),
        positions: [...positions].sort(([a], [b]) => a.localeCompare(b)),
        characters: byId(characters),
        ...withRestRules(restRules),
    };
}
