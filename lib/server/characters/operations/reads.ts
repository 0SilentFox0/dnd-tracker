import { NextResponse } from "next/server";
import { z } from "zod";

import { type CharacterOpCtx, defineCharacterOperation, responseBody } from "../operation-runner";

import { buildProgressionDto } from "@/lib/server/characters/core/get-progression-handler";
import { loadProgressionContext } from "@/lib/server/characters/core/load-progression-context";
import { markLevelSeenUnlocked, runProgressionActionUnlocked } from "@/lib/server/characters/core/progression-action-handler";
import { readCharacterLog } from "@/lib/server/characters/core/read-character-log";
import { readFreeArtifacts } from "@/lib/server/characters/core/read-free-artifacts";
import { readInventory } from "@/lib/server/characters/core/read-inventory";
import { readLog } from "@/lib/server/characters/core/read-log";
import { readCharacterSheet } from "@/lib/server/characters/core/read-sheet";
import { readStash } from "@/lib/server/characters/core/read-stash";

const byId = z.object({ characterId: z.string() });

const paged = byId.extend({ cursor: z.string().max(100).optional() });

/**
 * Reads and skill-tree actions that server pages and routes share as `NextResponse` handlers
 * (each resolves its own access); the assistant reaches them through the same registry.
 */
function viaResponse<I extends { characterId?: string }>(name: string, schema: z.ZodType<I>, call: (ctx: CharacterOpCtx, input: I) => Promise<NextResponse>) {
  return defineCharacterOperation({
    name,
    action: name,
    schema,
    unlocked: true,
    gate: async (ctx: CharacterOpCtx) => ctx,
    run: async (ctx, input) => responseBody(await call(ctx, input)),
  });
}

export const READ_OPERATIONS = {
  inventory: viaResponse("inventory", byId, ({ campaignId, characterId, actor }) => readInventory(campaignId, characterId, actor, true)),
  stash: viaResponse("stash", byId, ({ campaignId, characterId, actor }) => readStash(campaignId, characterId, actor)),
  "stash.log": viaResponse("stash.log", paged, ({ campaignId, characterId, actor }, { cursor }) => readLog(campaignId, characterId, cursor ?? null, actor)),
  log: viaResponse("log", paged, ({ campaignId, characterId, actor }, { cursor }) => readCharacterLog(campaignId, characterId, cursor ?? null, actor)),
  "stash.free-artifacts": viaResponse("stash.free-artifacts", z.object({ characterId: z.string().optional() }), ({ campaignId, actor }) => readFreeArtifacts(campaignId, actor)),
  sheet: viaResponse("sheet", byId, ({ campaignId, characterId, actor }) => readCharacterSheet({ id: campaignId, characterId }, actor)),
  progression: viaResponse("progression", byId, async ({ campaignId, characterId, actor }) => {
    const context = await loadProgressionContext(campaignId, characterId, actor);

    return context instanceof NextResponse ? context : NextResponse.json(await buildProgressionDto(campaignId, context));
  }),
  "progression.learn": viaResponse("progression.learn", byId.extend({ nodeId: z.string().min(1) }), ({ campaignId, characterId, actor }, { nodeId }) => runProgressionActionUnlocked(campaignId, characterId, { type: "learn", nodeId }, actor)),
  "progression.unlearn": viaResponse("progression.unlearn", byId.extend({ nodeIds: z.array(z.string().min(1)).min(1).max(100) }), ({ campaignId, characterId, actor }, { nodeIds }) => runProgressionActionUnlocked(campaignId, characterId, { type: "unlearn", nodeIds }, actor)),
  "progression.reset": viaResponse("progression.reset", byId, ({ campaignId, characterId, actor }) => runProgressionActionUnlocked(campaignId, characterId, { type: "reset" }, actor)),
  "progression.seen-level": viaResponse("progression.seen-level", byId, ({ campaignId, characterId, actor }) => markLevelSeenUnlocked(campaignId, characterId, actor)),
};
