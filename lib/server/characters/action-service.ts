import { NextResponse } from "next/server";
import { z } from "zod";

import { createCharacter } from "./operations/create";
import { DELETE as deleteCharacter } from "./operations/delete";
import { DELETE as deleteAll } from "./operations/delete-all";
import { readCharacter } from "./operations/get";
import { PUT as goals } from "./operations/goals";
import { listCharacters } from "./operations/list";
import { PUT as notes } from "./operations/notes";
import { patchCharacter } from "./operations/patch";
import { reviewCharacter } from "./operations/review";
import { readRoster } from "./operations/roster";
import { POST as tokenCreate } from "./operations/tokens-create";
import { DELETE as tokenDelete } from "./operations/tokens-delete";
import { assertSafeCharacterAvatar } from "./avatar-input";
import { operationAccess, withCharacterOperation } from "./operation-context";
import { characterReferenceHash } from "./reference-state";

import "server-only";
import { updateCharacterSchema } from "@/app/api/campaigns/[id]/characters/[characterId]/update-character-schema";
import { createCharacterSchema } from "@/app/api/campaigns/[id]/characters/create-character-schema";
import { prisma } from "@/lib/db";
import { putGoalsSchema } from "@/lib/schemas/character-goals";
import { putNotesSchema } from "@/lib/schemas/character-notes";
import { createTokenSchema } from "@/lib/schemas/character-tokens";
import { requestDigest } from "@/lib/server/assistant/intent-store";
import type { ActionResult } from "@/lib/server/assistant/types";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
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
export const characterResult = (data: unknown, id: string): ActionResult => ({ data: JSON.parse(JSON.stringify(data)), affected: [{ domain: "characters", id, name: "Персонажі" }], warnings: [] });
export async function responseData(response: NextResponse) {
  const data = await response.json();

  if (!response.ok) throw new ContentError(typeof data.error === "string" ? data.error : "Операцію відхилено", response.status);

  return data;
}
export async function characterState(actor: Actor, input: Record<string, unknown>) {
  await responseDataOrAccess(actor);

  const characters = await prisma.character.findMany({ where: { campaignId: actor.campaignId, ...(input.characterId ? { id: String(input.characterId) } : {}) }, include: {
    inventory: true, tokens: { orderBy: { id: "asc" } },
    inventoryLog: { select: { id: true }, orderBy: { id: "asc" } },
    characterLog: { select: { id: true }, orderBy: { id: "asc" } },
    characterSkills: { orderBy: { id: "asc" } },
    scenarioPages: { select: { id: true, title: true }, orderBy: { id: "asc" } },
  }, orderBy: { id: "asc" } });

  const campaign = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { rules: true, maxLevel: true, allowPlayerEdit: true, members: { select: { userId: true, role: true }, orderBy: { userId: "asc" } } } });

  return { characters, campaign, refsHash: await characterReferenceHash(actor.campaignId) };
}

async function responseDataOrAccess(actor: Actor) {
  const access = await operationAccess(actor.campaignId, true, actor);

  if (access instanceof NextResponse) await responseData(access);
}

export async function runCharacterOperation(actor: Actor, operation: string, raw: Record<string, unknown>, expected?: string): Promise<ActionResult> {
  const schema = CHARACTER_INPUTS[operation as keyof typeof CHARACTER_INPUTS];

  if (!schema) throw new ContentError("Невідома операція", 400);

  assertCan(actor, { access: "dm", scope: characterReads.has(operation) ? "characters:read" : "characters:write" });

  assertSafeCharacterAvatar(raw);

  const parsed = schema.safeParse(raw);

  if (!parsed.success) throw new ContentError("Некоректні дані персонажа", 400);

  const input = parsed.data as Record<string, unknown>;

  return withCharacterOperation(actor.campaignId, operation, input, async () => {
    await responseDataOrAccess(actor);

    const characterId = String(input.characterId ?? "");


    if (expected && requestDigest(await characterState(actor, input)) !== expected) throw new ContentError("Персонажі або доступ змінилися", 409);

    const request = new Request("http://local/characters?" + new URLSearchParams(Object.entries(input).map(([k, v]) => [k, String(v)])), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });

    const ctx = { params: Promise.resolve({ id: actor.campaignId, characterId, tokenId: String(input.tokenId ?? "") }) };

    let response: NextResponse;

    switch (operation) {
      case "create": response = await createCharacter(request, actor.campaignId, actor); break;
      case "list": response = await listCharacters(request, actor.campaignId, actor); break;
      case "roster": response = await readRoster(actor.campaignId, actor); break;
      case "get": response = await readCharacter(actor.campaignId, characterId, actor); break;
      case "patch": response = await patchCharacter(request, actor.campaignId, characterId, actor); break;
      case "review": response = await reviewCharacter(request, actor.campaignId, characterId, actor); break;
      case "notes": response = await notes(request, ctx, actor); break;
      case "goals": response = await goals(request, ctx, actor); break;
      case "tokens.create": response = await tokenCreate(request, ctx, actor); break;
      case "tokens.delete": response = await tokenDelete(request, ctx, actor); break;
      case "delete": response = await deleteCharacter(request, ctx, actor); break;
      case "delete-all": response = await deleteAll(request, ctx, actor); break;
      default: throw new ContentError("Невідома операція", 400);
    }

    const data = await responseData(response);

    if (operation === "get" && data.campaign) {
      const { inviteCode: _inviteCode, ...campaign } = data.campaign;

      data.campaign = campaign;
    }

    const result = characterResult(data, data.id ?? (characterId || actor.campaignId));

    if (data.name) result.affected[0].name = data.name;

    return result;
  });
}
