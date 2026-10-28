import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { operationAccess } from "./campaign-access";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/utils/api/actor";
import { type CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";

export type CharacterWithInventory = Prisma.CharacterGetPayload<{ include: { inventory: true } }>;

export type CharacterRow = { id: string; campaignId: string; controlledBy: string | null };

export type CharacterGate<C = CharacterWithInventory> = { access: CampaignAccessResult; character: C };

export type GateOptions = { dmOnly?: boolean; actor?: Actor; access?: CampaignAccessResult; notFound?: string; foreign404?: boolean };

export const loadCharacterWithInventory = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, include: { inventory: true } });

const loadCharacterRow = (characterId: string) => prisma.character.findUnique({ where: { id: characterId }, select: { id: true, campaignId: true, controlledBy: true } });

export async function gateCharacter<T extends { campaignId: string; controlledBy?: string | null }>(
  campaignId: string,
  query: PromiseLike<T | null>,
  dmOnly: boolean,
  actor?: Actor,
  preloaded?: CampaignAccessResult,
  notFound: string = API_ERRORS.CHARACTER_NOT_FOUND,
  foreign404 = false,
): Promise<CharacterGate<T> | NextResponse> {
  const access = preloaded ?? await operationAccess(campaignId, dmOnly, actor);

  if (access instanceof NextResponse) return access;

  if (preloaded && dmOnly && !access.isDM) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  const found = foreign404 ? await query : null;

  const character = foreign404 ? (found && found.campaignId === campaignId ? found : errorResponse(notFound, 404)) : await loadOwned(query, campaignId, notFound);

  if (character instanceof NextResponse) return character;

  if (!access.isDM && character.controlledBy !== access.userId) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  return { access, character };
}

export function requireCharacterAccess(campaignId: string, characterId: string, opts: GateOptions = {}) {
  return gateCharacter(campaignId, loadCharacterWithInventory(characterId), !!opts.dmOnly, opts.actor, opts.access, opts.notFound, opts.foreign404);
}

export function requireCharacterRow(campaignId: string, characterId: string, opts: GateOptions = {}) {
  return gateCharacter(campaignId, loadCharacterRow(characterId), !!opts.dmOnly, opts.actor, opts.access, opts.notFound, opts.foreign404);
}

export function requireCharacterRecord(campaignId: string, characterId: string, opts: GateOptions = {}) {
  return gateCharacter(campaignId, prisma.character.findUnique({ where: { id: characterId } }), !!opts.dmOnly, opts.actor, opts.access, opts.notFound, opts.foreign404);
}

export function requireCharacterSelect<S extends Prisma.CharacterSelect>(campaignId: string, characterId: string, select: S, opts: GateOptions = {}) {
  const query = prisma.character.findUnique({ where: { id: characterId }, select }) as unknown as PromiseLike<Prisma.CharacterGetPayload<{ select: S }> & { campaignId: string } | null>;

  return gateCharacter(campaignId, query, !!opts.dmOnly, opts.actor, opts.access, opts.notFound, opts.foreign404);
}
