import { NextResponse } from "next/server";
import { z } from "zod";

import { PUT as choices } from "./operations/choices";
import { POST as experience } from "./operations/experience";
import { POST as hitDice } from "./operations/hit-dice";
import { POST as inspiration } from "./operations/inspiration";
import { updateInventory, updateInventorySchema } from "./operations/inventory-update";
import { POST as levelUp } from "./operations/level-up";
import { PATCH as resources } from "./operations/resources";
import { POST as rest } from "./operations/rest";
import { POST as roll } from "./operations/roll";
import { applyStash } from "./operations/stash-update";
import { transferArtifact, transferSchema } from "./operations/transfer";
import { characterIdSchema, characterResult, responseData } from "./action-service";
import { LevelUpBodySchema } from "./class-level-up";
import { characterIds, operationAccess, withCharacterOperation } from "./operation-context";
import { characterReferenceHash } from "./reference-state";

import "server-only";
import { readInventory } from "@/app/api/campaigns/[id]/characters/[characterId]/inventory/read-inventory";
import { readCharacterLog } from "@/app/api/campaigns/[id]/characters/[characterId]/log/read-character-log";
import { buildProgressionDto } from "@/app/api/campaigns/[id]/characters/[characterId]/progression/get-progression-handler";
import { loadProgressionContext } from "@/app/api/campaigns/[id]/characters/[characterId]/progression/load-progression-context";
import { markLevelSeen, runProgressionAction } from "@/app/api/campaigns/[id]/characters/[characterId]/progression/progression-action-handler";
import { readCharacterSheet } from "@/app/api/campaigns/[id]/characters/[characterId]/sheet/read-sheet";
import { readFreeArtifacts } from "@/app/api/campaigns/[id]/characters/[characterId]/stash/free-artifacts/read-free-artifacts";
import { readLog } from "@/app/api/campaigns/[id]/characters/[characterId]/stash/log/read-log";
import { readStash } from "@/app/api/campaigns/[id]/characters/[characterId]/stash/read-stash";
import { stashActionSchema } from "@/app/api/campaigns/[id]/characters/[characterId]/stash/stash-schema";
import { prisma } from "@/lib/db";
import { ChoicesBodySchema } from "@/lib/schemas/choices";
import { experienceSchema, hitDieSchema, inspirationSchema, resourcesEditSchema, restSchema, sheetRollSchema } from "@/lib/schemas/out-of-combat";
import { requestDigest } from "@/lib/server/assistant/intent-store";
import type { ActionResult } from "@/lib/server/assistant/types";
import { assertCan } from "@/lib/server/content/access";
import { ContentError } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";
import { parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";

const withId = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.extend(characterIdSchema.shape).strict();

const stashWithId = z.union(stashActionSchema.options.map(schema => schema.extend(characterIdSchema.shape).strict()));

const serverRoll = z.union(sheetRollSchema.options.map(schema => schema.extend({ ...characterIdSchema.shape, mode: z.literal("server") }).strict()));

export const PROGRESSION_INPUTS = {
  "level-up": withId(LevelUpBodySchema), choices: withId(ChoicesBodySchema), resources: withId(resourcesEditSchema),
  "inventory.patch": withId(updateInventorySchema), "inventory": characterIdSchema,
  "stash": characterIdSchema, "stash.apply": stashWithId, "transfer": withId(transferSchema),
  "hit-dice": withId(hitDieSchema), inspiration: withId(inspirationSchema), rest: restSchema.strict(), experience: experienceSchema.strict(),
  roll: serverRoll, sheet: characterIdSchema, progression: characterIdSchema,
  "progression.learn": characterIdSchema.extend({ nodeId: z.string().min(1) }).strict(),
  "progression.unlearn": characterIdSchema.extend({ nodeIds: z.array(z.string().min(1)).min(1).max(100) }).strict(),
  "progression.reset": characterIdSchema, "progression.seen-level": characterIdSchema,
  log: characterIdSchema.extend({ cursor: z.string().max(100).optional() }), "stash.log": characterIdSchema.extend({ cursor: z.string().max(100).optional() }), "stash.free-artifacts": z.object({})
};
export const progressionReads = new Set(["inventory", "stash", "sheet", "progression", "log", "stash.log", "stash.free-artifacts"]);

export async function progressionState(actor: Actor, input: Record<string, unknown>, operation?: string) {
  if (operation) await validateCharacterInputRefs(actor, operation, input);

  const access = await operationAccess(actor.campaignId, true, actor);

  if (access instanceof NextResponse) await responseData(access);

  const ids = characterIds(input);

  const where = { campaignId: actor.campaignId };

  const characters = await prisma.character.findMany({ where: { ...where, ...(ids.length ? { id: { in: ids } } : {}) }, include: { inventory: true }, orderBy: { id: "asc" } });

  if (ids.length && characters.length !== ids.length) throw new ContentError("Персонажа не знайдено", 404);

  const inventories = await prisma.characterInventory.findMany({ where: { character: where }, orderBy: { characterId: "asc" } });

  const campaign = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { rules: true, maxLevel: true, allowPlayerEdit: true, members: { select: { userId: true, role: true }, orderBy: { userId: "asc" } } } });

  const refsHash = await characterReferenceHash(actor.campaignId);

  return { characters, inventories, campaign, refsHash };
}

export async function runCharacterProgression(actor: Actor, operation: string, raw: Record<string, unknown>, expected?: string): Promise<ActionResult> {
  const schema = PROGRESSION_INPUTS[operation as keyof typeof PROGRESSION_INPUTS];

  if (!schema) throw new ContentError("Невідома операція", 400);

  assertCan(actor, { access: "dm", scope: progressionReads.has(operation) ? "characters:read" : "characters:write" });

  if ("additionalSpells" in raw) throw new ContentError("UNSUPPORTED_FIELD: additionalSpells — вручну", 422);

  const parsed = schema.safeParse(raw);

  if (!parsed.success) throw new ContentError("Некоректні дані прогресу", 400);

  const input = parsed.data as Record<string, unknown>;

  return withCharacterOperation(actor.campaignId, operation, input, async () => {
    const access = await operationAccess(actor.campaignId, true, actor);

    if (access instanceof NextResponse) await responseData(access);

    if (expected && requestDigest(await progressionState(actor, input, operation)) !== expected) throw new ContentError("Прогрес або залежності змінилися", 409);

    await validateCharacterInputRefs(actor, operation, input);

    const characterId = String(input.characterId ?? "");

    const body = { ...input };

    delete body.mode;

    const request = new Request("http://local", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    const ctx = { params: Promise.resolve({ id: actor.campaignId, characterId }) };

    let response: NextResponse;

    switch (operation) {
      case "choices": response = await choices(request, ctx, actor); break;
      case "resources": response = await resources(request, ctx, actor); break;
      case "roll": response = await roll(request, ctx, actor); break;
      case "hit-dice": response = await hitDice(request, ctx, actor); break;
      case "inspiration": response = await inspiration(request, ctx, actor); break;
      case "level-up": response = await levelUp(request, ctx, actor); break;
      case "rest": response = await rest(request, ctx, actor); break;
      case "experience": response = await experience(request, ctx, actor); break;
      case "inventory.patch": response = await updateInventory(request, actor.campaignId, characterId, actor); break;
      case "stash.apply": response = await applyStash(request, actor.campaignId, characterId, actor); break;
      case "transfer": response = await transferArtifact(request, actor.campaignId, characterId, actor); break;
      case "inventory": response = await readInventory(actor.campaignId, characterId, actor, true); break;
      case "stash": response = await readStash(actor.campaignId, characterId, actor); break;
      case "stash.log": response = await readLog(actor.campaignId, characterId, input.cursor ? String(input.cursor) : null, actor); break;
      case "log": response = await readCharacterLog(actor.campaignId, characterId, input.cursor ? String(input.cursor) : null, actor); break;
      case "stash.free-artifacts": response = await readFreeArtifacts(actor.campaignId, actor); break;
      case "sheet": response = await readCharacterSheet({ id: actor.campaignId, characterId }, actor); break;
      case "progression": {
        const context = await loadProgressionContext(actor.campaignId, characterId, actor);

        response = context instanceof NextResponse ? context : NextResponse.json(await buildProgressionDto(actor.campaignId, context)); break;
      }
      case "progression.learn": response = await runProgressionAction(actor.campaignId, characterId, { type: "learn", nodeId: String(input.nodeId) }, actor); break;
      case "progression.unlearn": response = await runProgressionAction(actor.campaignId, characterId, { type: "unlearn", nodeIds: input.nodeIds as string[] }, actor); break;
      case "progression.reset": response = await runProgressionAction(actor.campaignId, characterId, { type: "reset" }, actor); break;
      case "progression.seen-level": response = await markLevelSeen(actor.campaignId, characterId, actor); break;
      default: throw new ContentError("Невідома операція", 400);
    }

    const data = await responseData(response);

    if (data && typeof data === "object" && "notes" in data && data.controlledBy !== actor.userId) delete data.notes;

    const result = characterResult(data, characterId || actor.campaignId);

    // Multi-character actions report every affected hero for cache invalidation.
    if (Array.isArray(input.characterIds)) result.affected = (input.characterIds as string[]).map(id => ({ domain: "characters", id, name: "Персонаж" }));

    if (input.toCharacterId) result.affected.push({ domain: "characters", id: String(input.toCharacterId), name: "Персонаж" });

    return result;
  });
}

/** Agent-supplied ids must resolve in this campaign, including legacy HOMM inventory refs. */
export async function validateCharacterInputRefs(actor: Actor, operation: string, input: Record<string, unknown>) {
  const refs = operation === "inventory.patch"
    ? [...Object.values((input.equipped ?? {}) as Record<string, unknown>), (input.equipSlot as { artifactId?: unknown } | undefined)?.artifactId]
    : operation === "transfer" ? [input.artifactId] : [];

  const supplied = refs.filter((ref): ref is string => typeof ref === "string" && ref.length > 0);

  if (supplied.some(ref => !parseItemRef(ref))) throw new ContentError("Некоректне посилання предмета", 422);

  const ids = [...new Set(supplied.flatMap(refArtifactIds))];

  if (!ids.length) return;

  const rows = await prisma.artifact.findMany({ where: { campaignId: actor.campaignId, id: { in: ids } }, select: { id: true } });

  if (rows.length !== ids.length) throw new ContentError("Предмет не знайдено в цій кампанії", 404);
}
