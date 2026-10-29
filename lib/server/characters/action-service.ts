import { z } from "zod";

import { CHARACTER_OPERATIONS } from "./operations/registry";
import { assertSafeCharacterAvatar } from "./avatar-input";
import { withCharacterOperation } from "./operation-context";
import { actorDmAccess, runCharacterOperation as runOperationCore } from "./operation-runner";
import { characterReferenceHash } from "./reference-state";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { putGoalsSchema } from "@/lib/schemas/character-goals";
import { putNotesSchema } from "@/lib/schemas/character-notes";
import { createTokenSchema } from "@/lib/schemas/character-tokens";
import { actionResult, requestDigest } from "@/lib/server/assistant/json";
import { resultLabel } from "@/lib/server/assistant/result-labels";
import type { ActionResult } from "@/lib/server/assistant/types";
import { createCharacterSchema } from "@/lib/server/characters/core/create-character-schema";
import { updateCharacterSchema } from "@/lib/server/characters/core/update-character-schema";
import { assertCan } from "@/lib/server/content/access";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";

export const characterIdSchema = z.object({ characterId: z.string().min(1).max(100) });
export const CHARACTER_INPUTS = {
  create: createCharacterSchema,
  list: z.object({ type: z.enum(["player", "npc_hero"]).optional(), compact: z.boolean().optional(), status: z.enum(["pending", "active"]).optional() }),
  roster: z.object({}), get: characterIdSchema, patch: updateCharacterSchema.extend(characterIdSchema.shape),
  delete: characterIdSchema, "delete-all": z.object({}),
  review: characterIdSchema.extend({ action: z.enum(["approve", "return"]), note: z.string().trim().min(1).max(1000).optional() }),
  notes: putNotesSchema.extend(characterIdSchema.shape), goals: putGoalsSchema.extend(characterIdSchema.shape),
  "tokens.create": createTokenSchema.extend(characterIdSchema.shape), "tokens.delete": characterIdSchema.extend({ tokenId: z.string().min(1).max(100) })
};
export const characterReads = new Set(["list", "get", "roster"]);
export async function characterState(actor: Actor, input: Record<string, unknown>) {
  await actorDmAccess(actor);

  return characterFingerprint(actor, input);
}

async function characterFingerprint(actor: Actor, input: Record<string, unknown>) {
  const where = { campaignId: actor.campaignId, ...(input.characterId ? { id: String(input.characterId) } : {}) };

  const characters = input.characterId
    ? await prisma.character.findMany({ where, include: {
      inventory: true, tokens: { orderBy: { id: "asc" } },
      inventoryLog: { select: { id: true }, orderBy: { id: "asc" } },
      characterLog: { select: { id: true }, orderBy: { id: "asc" } },
      characterSkills: { orderBy: { id: "asc" } },
      scenarioPages: { select: { id: true, title: true }, orderBy: { id: "asc" } },
    }, orderBy: { id: "asc" } })
    : await prisma.character.findMany({ where, select: { id: true, name: true, type: true, updatedAt: true }, orderBy: { id: "asc" } });

  const campaign = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { rules: true, maxLevel: true, allowPlayerEdit: true, members: { select: { userId: true, role: true }, orderBy: { userId: "asc" } } } });

  return { characters, campaign, refsHash: await characterReferenceHash(actor.campaignId) };
}

export async function runCharacterOperation(actor: Actor, operation: string, raw: Record<string, unknown>, expected?: string, locale: Locale = DEFAULT_LOCALE): Promise<ActionResult> {
  const characterResult = actionResult("characters", resultLabel(locale, "characters"));

  const schema = CHARACTER_INPUTS[operation as keyof typeof CHARACTER_INPUTS];

  const core = CHARACTER_OPERATIONS[operation];

  if (!schema || !core) throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_OPERATION, 400);

  assertCan(actor, { access: "dm", scope: characterReads.has(operation) ? "characters:read" : "characters:write" });

  assertSafeCharacterAvatar(raw);

  const parsed = schema.safeParse(raw);

  if (!parsed.success) throw new ContentError(API_ERRORS.CHARACTER_DATA_INVALID, 400);

  const input = parsed.data as Record<string, unknown>;

  return withCharacterOperation(actor.campaignId, operation, input, async () => {
    const access = await actorDmAccess(actor);

    const characterId = String(input.characterId ?? "");

    if (expected && requestDigest(await characterFingerprint(actor, input)) !== expected) throw new ContentError(API_ERRORS.ASSISTANT_CHARACTERS_CHANGED, 409);

    const data = (await runOperationCore(core, { campaignId: actor.campaignId, characterId, actor, access }, parseInput(core.schema, input))) as { id?: string; name?: string; campaign?: Record<string, unknown> };

    if (operation === "get" && data.campaign) {
      const { inviteCode: _inviteCode, ...campaign } = data.campaign;

      data.campaign = campaign;
    }

    const result = characterResult(data, data.id ?? (characterId || actor.campaignId));

    if (data.name) result.affected[0].name = data.name;

    return result;
  });
}
