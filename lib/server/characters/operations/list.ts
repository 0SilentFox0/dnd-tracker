import { z } from "zod";

import { characterHandler, defineCharacterOperation, memberScope } from "../operation-runner";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterStatus, type CharacterStatusValue, CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";

const COMPACT_SELECT = {
  id: true,
  campaignId: true,
  type: true,
  controlledBy: true,
  name: true,
  level: true,
  class: true,
  race: true,
  avatar: true,
} as const;

const LIST_SELECT = {
  ...COMPACT_SELECT,
  subrace: true,
  constitution: true,
  archetype: true,
  classes: true,
  armorClass: true,
  initiative: true,
  experience: true,
  inspiration: true,
  resources: true,
  user: { select: { displayName: true } },
} as const;

const listSchema = z.object({ type: z.string().nullish(), compact: z.boolean().optional(), status: z.string().nullish() });

export const listOperation = defineCharacterOperation({
  name: "list",
  action: "list characters",
  schema: listSchema,
  unlocked: true,
  gate: memberScope,
  query: ({ searchParams }) => ({ type: searchParams.get("type"), compact: searchParams.get("compact") === "1" || searchParams.get("compact") === "true", status: searchParams.get("status") }),
  run: async ({ access, campaignId }, { type, compact, status }) => {
    const pending = status === CharacterStatus.PENDING;

    if (pending && !access.isDM) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

    const where: { campaignId: string; status: CharacterStatusValue; type?: CharacterTypeValue } = {
      campaignId,
      status: pending ? CharacterStatus.PENDING : CharacterStatus.ACTIVE,
    };

    if (type === CharacterType.PLAYER || type === CharacterType.NPC_HERO) where.type = type;

    const orderBy = { createdAt: "desc" } as const;

    return compact
      ? prisma.character.findMany({ where, select: COMPACT_SELECT, orderBy })
      : prisma.character.findMany({ where, select: pending ? { ...LIST_SELECT, reviewNote: true } : LIST_SELECT, orderBy });
  },
});

const list = characterHandler(listOperation);

export const listCharacters = (request: Request, campaignId: string, actor?: Actor) => list(request, campaignId, undefined, actor);
