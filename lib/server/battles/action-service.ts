import { z } from "zod";

import { prisma } from "@/lib/db";
import { BATTLE_COMMANDS, BATTLE_READS, type BattleActionInput,battleActionInput, HUMAN_BATTLE_ACTIONS } from "@/lib/server/assistant/actions/battle-actions";
import { contentSnapshot } from "@/lib/server/assistant/actions/content-snapshot";
import { requestDigest } from "@/lib/server/assistant/intent-store";
import type { ActionExecutionContext, ActionPreview, ActionResult, AssistantCaller, JsonValue } from "@/lib/server/assistant/types";
import { loadAudioLibrary } from "@/lib/server/audio/track-store";
import { assertDiceMode, schemaDiceInput, validateAttackPreview } from "@/lib/server/battles/dice";
import { getBattleOperation } from "@/lib/server/battles/operations";
import { battleRecord, type RecordOperation, recordSchemas, requireBattleId } from "@/lib/server/battles/record-service";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { currentContentWrite, runContentWriteContext } from "@/lib/server/content/write-context";
import { isHostedOnProjectStorage } from "@/lib/supabase/image-storage";
import type { Actor } from "@/lib/utils/api/actor";
import { needFailure } from "@/lib/utils/api/need";
import { toBattleResponse } from "@/lib/utils/battle/pipeline/battle-response";
import { defaultPipelineDeps } from "@/lib/utils/battle/pipeline/default-deps";
import { executeBattleOperation } from "@/lib/utils/battle/pipeline/execute-battle-operation";
import { guardBattleContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError, loadAllEvents, loadEventsBefore, loadRecentEvents } from "@/lib/utils/battle/store";
import { summarizeBattle } from "@/lib/utils/battle/view/summary";
import { parseRules } from "@/lib/utils/rules/schema";

const json = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value));

const result = (data: unknown, id: string): ActionResult => ({ data: json(data), affected: [{ domain: "battles", id, name: "Бій" }], warnings: [] });

const isCommand = (op: string) => (BATTLE_COMMANDS as readonly string[]).includes(op);

const isRead = (op: string) => (BATTLE_READS as readonly string[]).includes(op);

async function liveAccess(actor: Actor, write: boolean) {
  const failure = needFailure(actor, { access: "dm", scope: write ? "battles:write" : "battles:read" });

  if (failure) throw new ContentError(failure, 403);

  const member = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId: actor.campaignId, userId: actor.userId } } });

  if (member?.role !== "dm") throw new ContentError("Лише DM", 403);
}

async function state(actor: Actor, operation: string, value: BattleActionInput) {
  await liveAccess(actor, !isRead(operation));

  if (!isCommand(operation) && !(operation in recordSchemas) && !isRead(operation)) throw new ContentError("Невідома бойова операція", 404);

  if (operation === "create") {
    return { version: 0, row: null, loaded: null, fingerprint: requestDigest(await contentSnapshot(actor)), rows: [] };
  }

  if (operation === "clear-history") {
    const rows = await prisma.battleScene.findMany({ where: { campaignId: actor.campaignId }, orderBy: { id: "asc" } });

    return { version: 0, row: null, loaded: null, fingerprint: requestDigest(rows), rows };
  }

  if (!value.battleId) throw new ContentError("Потрібен battleId", 400);

  const row = await battleRecord(actor.campaignId, value.battleId);

  const loaded = await defaultPipelineDeps.loadBattle({ campaignId: actor.campaignId, battleId: value.battleId, userId: actor.userId });

  if (!loaded) throw new ContentError("Бій не знайдено", 404);

  if (!loaded.isMember || !loaded.isDM) throw new ContentError("Лише DM", 403);

  // Source changes can alter start/refresh/attack/spell outcomes without changing battle.version.
  const sources = await Promise.all([
    prisma.character.findMany({ where: { campaignId: actor.campaignId }, orderBy: { id: "asc" } }),
    prisma.unit.findMany({ where: { campaignId: actor.campaignId }, orderBy: { id: "asc" } }),
    prisma.spell.findMany({ where: { campaignId: actor.campaignId }, orderBy: { id: "asc" } }),
  ]);

  return { version: loaded.scene.version, row, loaded, rows: [row], fingerprint: requestDigest({ row, loaded, sources, references: await contentSnapshot(actor), audioLibrary: operation === "audio" ? await loadAudioLibrary(actor.campaignId) : null }) };
}

async function prepared(caller: AssistantCaller, operation: string, raw: unknown): Promise<ActionPreview> {
  const value = parseInput(battleActionInput, raw);

  assertDiceMode(value.body, value.dice);

  const current = await state(caller.actor, operation, value);

  if (isCommand(operation)) {
    if (!current.loaded) throw new ContentError("Бій не знайдено", 404);

    const params = { id: caller.actor.campaignId, battleId: requireBattleId(value.battleId), ...(typeof value.body.participantId === "string" && { participantId: value.body.participantId }) };

    const definition = { ...await getBattleOperation(operation, params), params, operation };

    // Access precedes schema errors, just like actual execution access cannot be fabricated by actor.isDM.
    const body = schemaDiceInput(operation, value.body, value.dice === "server");

    const ctx = guardBattleContext(caller.actor.userId, current.loaded, body, current.version, definition);

    const parsed = definition.schema ? parseInput(definition.schema, body) as Record<string, unknown> : body;

    const ids = [parsed.attackerId, parsed.casterId, parsed.participantId, parsed.targetId, parsed.targetParticipantId, ...(Array.isArray(parsed.targetParticipantIds) ? parsed.targetParticipantIds : []), ...(Array.isArray(parsed.targetIds) ? parsed.targetIds : [])].filter((id): id is string => typeof id === "string");

    for (const id of ids) if (![...ctx.participants, ...ctx.pending].some(p => p.basicInfo.id === id)) throw new ContentError("Учасника немає в бою", 404);

    if (operation === "attack") validateAttackPreview(ctx, parsed);

    if (operation === "spell") {
      const spell = await prisma.spell.findUnique({ where: { id: String(parsed.spellId) } });

      if (!spell || spell.campaignId !== caller.actor.campaignId) throw new ContentError("Заклинання не знайдено", 404);

      if (spell.executionMode === "manual" && !parsed.cancelCasting) throw new ContentError("Налаштуйте механіку заклинання або застосуйте його вручну", 422);
    }
  } else if (operation in recordSchemas) parseInput(recordSchemas[operation as RecordOperation] as z.ZodType, value.body);

  if (["create", "patch", "add-participant"].includes(operation)) {
    const refs = operation === "add-participant" ? [{ id: value.body.sourceId, type: value.body.type }] : (value.body.participants ?? []) as Array<{ id: string; type: string }>;

    for (const ref of refs) {
      const rows = ref.type === "character" ? await prisma.character.findMany({ where: { id: String(ref.id), campaignId: caller.actor.campaignId }, select: { id: true } }) : await prisma.unit.findMany({ where: { id: String(ref.id), campaignId: caller.actor.campaignId }, select: { id: true } });

      if (!rows.some(row => row.id === ref.id)) throw new ContentError("Джерела учасника немає в кампанії", 404);
    }
  }

  const map = value.body.map as { background?: string | null } | undefined;

  const background = map?.background;

  const stored = current.row?.map as { background?: string } | null;

  if (background && background !== stored?.background && !/^\/battle-maps\/[\w.-]+\.(webp|jpg|png)$/.test(background) && !isHostedOnProjectStorage(background)) throw new ContentError("Завантажте фон у чинному редакторі карти; асистент приймає збережені зображення", 400);

  const targets = current.rows.map(row => ({ domain: "battles", id: row.id, name: row.name }));

  const selectedIds = new Set([value.body.attackerId, value.body.casterId, value.body.participantId, value.body.targetId, value.body.targetParticipantId, ...(Array.isArray(value.body.targetIds) ? value.body.targetIds : []), ...(Array.isArray(value.body.targetParticipantIds) ? value.body.targetParticipantIds : [])]);

  for (const participant of [...current.loaded?.participants ?? [], ...current.loaded?.pending ?? []]) if (selectedIds.has(participant.basicInfo.id)) targets.push({ domain: "battle-participants", id: participant.basicInfo.id, name: participant.basicInfo.name });

  const target = targets[0] ?? { domain: "battles", id: caller.actor.campaignId, name: "Новий бій" };

  const deletion = ["delete", "clear-history"].includes(operation) || (operation === "participants.patch" && value.body.removeFromBattle === true);

  const accessChange = operation === "unit-control";

  const erasure = (operation === "maze" && value.body.op === "generate") || (operation === "patch" && (value.body.participants !== undefined || value.body.map !== undefined));

  const destructive = HUMAN_BATTLE_ACTIONS.has(operation) || deletion || erasure;

  return {
    summary: `Бої: ${operation}`, targets,
    changes: [{ target, path: operation, before: json({ version: current.version, battle: current.row, participants: current.loaded?.participants ?? [], reserve: current.loaded?.pending ?? [] }), after: json(value) }],
    warnings: ["Кубики та випадкові ефекти обчислюються лише під час виконання; результат ще невідомий.", ...(operation === "clear-history" ? ["Буде видалено всі бої кампанії разом із подіями та знімками."] : []), ...(value.dice === "manual" ? ["Використовуються явно задані ДМ значення кидків."] : [])],
    preconditions: { version: current.version, fingerprint: current.fingerprint },
    effects: [{ kind: accessChange ? "change-access" : destructive ? (deletion ? "delete" : "erase-progress") : operation === "create" ? "create" : "update", targets, description: operation }],
  };
}

export function prepareBattleAction(caller: AssistantCaller, operation: string, raw: unknown): Promise<ActionPreview> {
  return withCampaignContentWrite(caller.actor.campaignId, () => prepared(caller, operation, raw)).catch(error => {
    if (error instanceof BattleRuleError) throw new ContentError(error.message, 422);

    if (error instanceof BattleAccessError) throw new ContentError(error.message, error.status);

    throw error;
  });
}

export async function runBattleAction(actor: Actor, operation: string, raw: unknown, expected: unknown, execution?: ActionExecutionContext): Promise<ActionResult> {
  const value = parseInput(battleActionInput, raw);

  const run = () => withCampaignContentWrite(actor.campaignId, async () => {
    const fresh = await prepareBattleAction({ actor, channel: execution?.caller.channel ?? "chat", threadId: null, tokenId: null }, operation, value);

    if (requestDigest(fresh.preconditions) !== requestDigest(expected)) throw new ContentError("Бій змінився; підготуйте новий перегляд", 409);

    return executeBattleOperation(actor, { operation, battleId: value.battleId ?? "", input: value.body, expectedVersion: (fresh.preconditions as { version: number }).version, serverDice: value.dice === "server" }, execution);
  });

  const current = currentContentWrite();

  if (current && (current.campaignId !== actor.campaignId || (execution && current.db !== execution.db))) throw new ContentError("Невідповідна транзакція", 403);

  if (execution && (execution.caller.actor.userId !== actor.userId || execution.caller.actor.campaignId !== actor.campaignId)) throw new ContentError("Невідповідний actor", 403);

  return execution ? runContentWriteContext(actor.campaignId, execution.db, run) : run();
}

export async function readBattleAction(actor: Actor, operation: string, raw: unknown): Promise<ActionResult> {
  await liveAccess(actor, false);

  const value = parseInput(battleActionInput, raw);

  const campaignId = actor.campaignId;

  if (operation === "list" || operation === "active") {
    const page = parseInput(z.object({ offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(30) }).strict(), value.body);

    const rows = await prisma.battleScene.findMany({ where: { campaignId, ...(operation === "active" && { status: "active" }) }, orderBy: { createdAt: "desc" }, skip: page.offset, take: page.limit + 1, select: { id: true, name: true, status: true, version: true } });

    return result({ items: rows.slice(0, page.limit), nextOffset: rows.length > page.limit ? page.offset + page.limit : null }, campaignId);
  }

  if (operation === "balance.get" || operation === "balance") {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

    if (!campaign) throw new ContentError("Кампанію не знайдено", 404);

    return result(await battleBalance(campaignId, operation === "balance" ? value.body : undefined, parseRules(campaign.rules)), campaignId);
  }

  if (!value.battleId) throw new ContentError("Потрібен battleId", 400);

  const row = await battleRecord(campaignId, value.battleId);

  if (operation === "version") return result({ version: row.version }, row.id);

  if (operation === "audio.get") return result({ audio: row.audio }, row.id);

  if (operation === "events") {
    const page = parseInput(z.object({ before: z.number().int().min(1), limit: z.number().int().min(1).max(100).default(30) }).strict(), value.body);

    return result(await loadEventsBefore(prisma, row.id, page), row.id);
  }

  const loaded = await defaultPipelineDeps.loadBattle({ campaignId, battleId: row.id, userId: actor.userId });

  if (!loaded?.isMember || !loaded.isDM) throw new ContentError("Доступ заборонено", 403);

  if (operation === "summary") return result(summarizeBattle(await loadAllEvents(prisma, row.id), loaded.participants), row.id);

  if (operation !== "get") throw new ContentError("Невідома бойова операція", 404);

  return result(toBattleResponse(loaded, loaded.scene, loaded.participants, loaded.pending, { mode: "full", entries: await loadRecentEvents(prisma, row.id, 30) }, { isDM: loaded.isDM }), row.id);
}

export async function battleBalance(campaignId: string, input: unknown | undefined, rules: import("@/lib/utils/rules").Ruleset) {
  if (input === undefined) return (await import("@/app/api/campaigns/[id]/battles/balance/balance-get")).getBalancePayload(campaignId, rules);

  const { balanceSchema } = await import("@/app/api/campaigns/[id]/battles/balance/balance-schema");

  return (await import("@/app/api/campaigns/[id]/battles/balance/balance-post")).postBalanceResponse(campaignId, parseInput(balanceSchema, input), rules);
}
