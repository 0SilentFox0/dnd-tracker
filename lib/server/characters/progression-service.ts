import { z } from "zod";

import { updateInventorySchema } from "./operations/inventory-update";
import { CHARACTER_OPERATIONS } from "./operations/registry";
import { transferSchema } from "./operations/transfer";
import { characterIdSchema, characterResult } from "./action-service";
import { LevelUpBodySchema } from "./class-level-up";
import { characterIds, withCharacterOperation } from "./operation-context";
import { actorDmAccess, runCharacterOperation as runOperationCore } from "./operation-runner";
import { characterReferenceHash } from "./reference-state";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { ChoicesBodySchema } from "@/lib/schemas/choices";
import { arcaneRecoverySchema, experienceSchema, hitDieSchema, inspirationSchema, resourcesEditSchema, restSchema, sheetRollSchema } from "@/lib/schemas/out-of-combat";
import { requestDigest } from "@/lib/server/assistant/json";
import type { ActionResult } from "@/lib/server/assistant/types";
import { stashActionSchema } from "@/lib/server/characters/core/stash-schema";
import { assertCan } from "@/lib/server/content/access";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import type { Actor } from "@/lib/utils/api/actor";
import { parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";

const withId = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => schema.extend(characterIdSchema.shape).strict();

const stashWithId = z.union(stashActionSchema.options.map(schema => schema.extend(characterIdSchema.shape).strict()));

const serverRoll = z.union(sheetRollSchema.options.map(schema => schema.extend({ ...characterIdSchema.shape, mode: z.literal("server") }).strict()));

export const PROGRESSION_INPUTS = {
  "level-up": withId(LevelUpBodySchema), choices: withId(ChoicesBodySchema), resources: withId(resourcesEditSchema),
  "inventory.patch": withId(updateInventorySchema), "inventory": characterIdSchema,
  "stash": characterIdSchema, "stash.apply": stashWithId, "transfer": withId(transferSchema),
  "hit-dice": withId(hitDieSchema), "arcane-recovery": withId(arcaneRecoverySchema), inspiration: withId(inspirationSchema), rest: restSchema.strict(), experience: experienceSchema.strict(),
  roll: serverRoll, sheet: characterIdSchema, progression: characterIdSchema,
  "progression.learn": characterIdSchema.extend({ nodeId: z.string().min(1) }).strict(),
  "progression.unlearn": characterIdSchema.extend({ nodeIds: z.array(z.string().min(1)).min(1).max(100) }).strict(),
  "progression.reset": characterIdSchema, "progression.seen-level": characterIdSchema,
  log: characterIdSchema.extend({ cursor: z.string().max(100).optional() }), "stash.log": characterIdSchema.extend({ cursor: z.string().max(100).optional() }), "stash.free-artifacts": z.object({})
};
export const progressionReads = new Set(["inventory", "stash", "sheet", "progression", "log", "stash.log", "stash.free-artifacts"]);

export async function progressionState(actor: Actor, input: Record<string, unknown>, operation?: string) {
  if (operation) await validateCharacterInputRefs(actor, operation, input);

  await actorDmAccess(actor);

  return progressionFingerprint(actor, input);
}

async function progressionFingerprint(actor: Actor, input: Record<string, unknown>) {
  const ids = characterIds(input);

  const where = { campaignId: actor.campaignId, ...(ids.length ? { id: { in: ids } } : {}) };

  const characters = ids.length
    ? await prisma.character.findMany({ where, include: { inventory: true }, orderBy: { id: "asc" } })
    : await prisma.character.findMany({ where, select: { id: true, name: true, updatedAt: true }, orderBy: { id: "asc" } });

  if (ids.length && characters.length !== ids.length) throw new ContentError(API_ERRORS.CHARACTER_NOT_FOUND, 404);

  const campaign = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { rules: true, maxLevel: true, allowPlayerEdit: true, members: { select: { userId: true, role: true }, orderBy: { userId: "asc" } } } });

  const refsHash = await characterReferenceHash(actor.campaignId);

  return { characters, campaign, refsHash };
}

export async function runCharacterProgression(actor: Actor, operation: string, raw: Record<string, unknown>, expected?: string): Promise<ActionResult> {
  const schema = PROGRESSION_INPUTS[operation as keyof typeof PROGRESSION_INPUTS];

  if (!schema) throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_OPERATION, 400);

  assertCan(actor, { access: "dm", scope: progressionReads.has(operation) ? "characters:read" : "characters:write" });

  if ("additionalSpells" in raw) throw new ContentError(API_ERRORS.CHARACTER_UNSUPPORTED_ADDITIONAL_SPELLS, 422);

  const parsed = schema.safeParse(raw);

  if (!parsed.success) throw new ContentError(API_ERRORS.CHARACTER_PROGRESS_DATA_INVALID, 400);

  const input = parsed.data as Record<string, unknown>;

  return withCharacterOperation(actor.campaignId, operation, input, async () => {
    const access = await actorDmAccess(actor);

    await validateCharacterInputRefs(actor, operation, input);

    if (expected && requestDigest(await progressionFingerprint(actor, input)) !== expected) throw new ContentError(API_ERRORS.CHARACTER_PROGRESS_DEPS_CHANGED, 409);

    const characterId = String(input.characterId ?? "");

    const body = { ...input };

    delete body.mode;

    const core = CHARACTER_OPERATIONS[operation];

    if (!core) throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_OPERATION, 400);

    return finishProgression(await runOperationCore(core, { campaignId: actor.campaignId, characterId, actor, access }, parseInput(core.schema, body)), actor, input, characterId);
  });
}

function finishProgression(data: unknown, actor: Actor, input: Record<string, unknown>, characterId: string): ActionResult {
  if (data && typeof data === "object" && "notes" in data && (data as { controlledBy?: unknown }).controlledBy !== actor.userId) delete (data as { notes?: unknown }).notes;

  const result = characterResult(data, characterId || actor.campaignId);

  // Multi-character actions report every affected hero for cache invalidation.
  if (Array.isArray(input.characterIds)) result.affected = (input.characterIds as string[]).map(id => ({ domain: "characters", id, name: "Персонаж" }));

  if (input.toCharacterId) result.affected.push({ domain: "characters", id: String(input.toCharacterId), name: "Персонаж" });

  return result;
}

/** Agent-supplied ids must resolve in this campaign, including legacy HOMM inventory refs. */
export async function validateCharacterInputRefs(actor: Actor, operation: string, input: Record<string, unknown>) {
  const refs = operation === "inventory.patch"
    ? [...Object.values((input.equipped ?? {}) as Record<string, unknown>), (input.equipSlot as { artifactId?: unknown } | undefined)?.artifactId]
    : operation === "transfer" ? [input.artifactId] : [];

  const supplied = refs.filter((ref): ref is string => typeof ref === "string" && ref.length > 0);

  if (supplied.some(ref => !parseItemRef(ref))) throw new ContentError(API_ERRORS.CHARACTER_ITEM_REF_INVALID, 422);

  const ids = [...new Set(supplied.flatMap(refArtifactIds))];

  if (!ids.length) return;

  const rows = await prisma.artifact.findMany({ where: { campaignId: actor.campaignId, id: { in: ids } }, select: { id: true } });

  if (rows.length !== ids.length) throw new ContentError(API_ERRORS.CHARACTER_ITEM_NOT_IN_CAMPAIGN, 404);
}
