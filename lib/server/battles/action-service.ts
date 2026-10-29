import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { BATTLE_COMMANDS, BATTLE_READS, type BattleActionInput,battleActionInput, HUMAN_BATTLE_ACTIONS } from "@/lib/server/assistant/actions/battle-actions";
import { contentSnapshot } from "@/lib/server/assistant/actions/content-snapshot";
import { actionResult, jsonContent, requestDigest } from "@/lib/server/assistant/json";
import type { ActionExecutionContext, ActionPreview, ActionResult, AssistantCaller } from "@/lib/server/assistant/types";
import { loadAudioLibrary } from "@/lib/server/audio/track-store";
import { assertDiceMode, schemaDiceInput, validateAttackPreview } from "@/lib/server/battles/dice";
import { executeBattleOperation } from "@/lib/server/battles/execute-battle-operation";
import { assertWriteScope, requireDmMember } from "@/lib/server/battles/guards";
import { getBattleOperation } from "@/lib/server/battles/operations";
import { defaultPipelineDeps } from "@/lib/server/battles/pipeline-deps";
import { battleRecord, type RecordOperation, recordSchemas, requireBattleId } from "@/lib/server/battles/record-service";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import { isHostedOnProjectStorage } from "@/lib/supabase/image-storage";
import type { Actor } from "@/lib/utils/api/actor";
import { needFailure } from "@/lib/utils/api/need";
import { pageOf } from "@/lib/utils/api/page-of";
import { toBattleResponse } from "@/lib/utils/battle/pipeline/battle-response";
import { guardBattleContext } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleRuleError, loadAllEvents, loadEventsBefore, loadRecentEvents } from "@/lib/utils/battle/store";
import { summarizeBattle } from "@/lib/utils/battle/view/summary";
import { parseRules } from "@/lib/utils/rules/schema";

const result = actionResult("battles", "Бій");

const isCommand = (op: string) => (BATTLE_COMMANDS as readonly string[]).includes(op);

const isRead = (op: string) => (BATTLE_READS as readonly string[]).includes(op);

function assertScope(actor: Actor, write: boolean) {
  const failure = needFailure(actor, { access: "dm", scope: write ? "battles:write" : "battles:read" });

  if (failure) throw new ContentError(failure, 403);
}

async function liveAccess(actor: Actor, write: boolean) {
  assertScope(actor, write);
  await requireDmMember(prisma, actor);
}

/** loadBattle already derives membership and role, so the separate member query only runs when the battle is missing. */
async function loadDmBattle(actor: Actor, battleId: string, denied: string = API_ERRORS.DM_ONLY) {
  const loaded = await defaultPipelineDeps.loadBattle({ campaignId: actor.campaignId, battleId, userId: actor.userId });

  if (!loaded) {
    await requireDmMember(prisma, actor);
    throw new ContentError(API_ERRORS.BATTLE_NOT_FOUND, 404);
  }

  if (!loaded.isMember || !loaded.isDM) throw new ContentError(denied, 403);

  return loaded;
}

async function state(actor: Actor, operation: string, value: BattleActionInput) {
  assertScope(actor, !isRead(operation));

  const known = isCommand(operation) || operation in recordSchemas || isRead(operation);

  if (!known || operation === "create" || operation === "clear-history" || !value.battleId) await requireDmMember(prisma, actor);

  if (!known) throw new ContentError(API_ERRORS.BATTLE_UNKNOWN_OPERATION, 404);

  if (operation === "create") {
    return { version: 0, row: null, loaded: null, fingerprint: requestDigest(await contentSnapshot(actor)), rows: [] };
  }

  if (operation === "clear-history") {
    const rows = await prisma.battleScene.findMany({ where: { campaignId: actor.campaignId }, orderBy: { id: "asc" } });

    return { version: 0, row: null, loaded: null, fingerprint: requestDigest(rows), rows };
  }

  if (!value.battleId) throw new ContentError(API_ERRORS.BATTLE_ID_REQUIRED, 400);

  const loaded = await loadDmBattle(actor, value.battleId);

  const row = await battleRecord(actor.campaignId, value.battleId);

  // Character/unit/spell changes can alter start/refresh/attack outcomes without changing battle.version; contentSnapshot stamps/digests cover them once.
  return { version: loaded.scene.version, row, loaded, rows: [row], fingerprint: requestDigest({ row, loaded, references: await contentSnapshot(actor), audioLibrary: operation === "audio" ? await loadAudioLibrary(actor.campaignId) : null }) };
}

async function prepared(caller: AssistantCaller, operation: string, raw: unknown): Promise<ActionPreview> {
  const value = parseInput(battleActionInput, raw);

  assertDiceMode(value.body, value.dice);

  const current = await state(caller.actor, operation, value);

  if (isCommand(operation)) {
    if (!current.loaded) throw new ContentError(API_ERRORS.BATTLE_NOT_FOUND, 404);

    const params = { id: caller.actor.campaignId, battleId: requireBattleId(value.battleId), ...(typeof value.body.participantId === "string" && { participantId: value.body.participantId }) };

    const definition = { ...await getBattleOperation(operation, params), params, operation };

    // Access precedes schema errors, just like actual execution access cannot be fabricated by actor.isDM.
    const body = schemaDiceInput(operation, value.body, value.dice === "server");

    const { ctx } = guardBattleContext(caller.actor.userId, current.loaded, body, current.version, definition);

    const parsed = definition.schema ? parseInput(definition.schema, body) as Record<string, unknown> : body;

    const ids = [parsed.attackerId, parsed.casterId, parsed.participantId, parsed.targetId, parsed.targetParticipantId, ...(Array.isArray(parsed.targetParticipantIds) ? parsed.targetParticipantIds : []), ...(Array.isArray(parsed.targetIds) ? parsed.targetIds : [])].filter((id): id is string => typeof id === "string");

    for (const id of ids) if (![...ctx.participants, ...ctx.pending].some(p => p.basicInfo.id === id)) throw new ContentError(API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE, 404);

    if (operation === "attack") validateAttackPreview(ctx, parsed);

    if (operation === "spell") {
      const spell = await prisma.spell.findUnique({ where: { id: String(parsed.spellId) } });

      if (!spell || spell.campaignId !== caller.actor.campaignId) throw new ContentError(API_ERRORS.BATTLE_SPELL_NOT_FOUND, 404);

      if (spell.executionMode === "manual" && !parsed.cancelCasting) throw new ContentError(API_ERRORS.BATTLE_SPELL_CONFIGURE_OR_MANUAL, 422);
    }
  } else if (operation in recordSchemas) parseInput(recordSchemas[operation as RecordOperation] as z.ZodType, value.body);

  if (["create", "patch", "add-participant"].includes(operation)) {
    const refs = operation === "add-participant" ? [{ id: value.body.sourceId, type: value.body.type }] : (value.body.participants ?? []) as Array<{ id: string; type: string }>;

    const byType = { character: new Set<string>(), unit: new Set<string>() };

    for (const ref of refs) (ref.type === "character" ? byType.character : byType.unit).add(String(ref.id));

    const [characters, units] = await Promise.all([
      byType.character.size ? prisma.character.findMany({ where: { id: { in: [...byType.character] }, campaignId: caller.actor.campaignId }, select: { id: true } }) : [],
      byType.unit.size ? prisma.unit.findMany({ where: { id: { in: [...byType.unit] }, campaignId: caller.actor.campaignId }, select: { id: true } }) : [],
    ]);

    const found = { character: new Set(characters.map(row => row.id)), unit: new Set(units.map(row => row.id)) };

    for (const ref of refs) if (!(ref.type === "character" ? found.character : found.unit).has(ref.id as string)) throw new ContentError(API_ERRORS.BATTLE_PARTICIPANT_SOURCE_MISSING, 404);
  }

  const map = value.body.map as { background?: string | null } | undefined;

  const background = map?.background;

  const stored = current.row?.map as { background?: string } | null;

  if (background && background !== stored?.background && !/^\/battle-maps\/[\w.-]+\.(webp|jpg|png)$/.test(background) && !isHostedOnProjectStorage(background)) throw new ContentError(API_ERRORS.BATTLE_BACKGROUND_UPLOAD_IN_EDITOR, 400);

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
    changes: [{ target, path: operation, before: jsonContent({ version: current.version, battle: current.row, participants: current.loaded?.participants ?? [], reserve: current.loaded?.pending ?? [] }), after: jsonContent(value) }],
    warnings: ["Кубики та випадкові ефекти обчислюються лише під час виконання; результат ще невідомий.", ...(operation === "clear-history" ? ["Буде видалено всі бої кампанії разом із подіями та знімками."] : []), ...(value.dice === "manual" ? ["Використовуються явно задані ДМ значення кидків."] : [])],
    preconditions: { version: current.version, fingerprint: current.fingerprint },
    effects: [{ kind: accessChange ? "change-access" : destructive ? (deletion ? "delete" : "erase-progress") : operation === "create" ? "create" : "update", targets, description: operation }],
  };
}

export function prepareBattleAction(caller: AssistantCaller, operation: string, raw: unknown): Promise<ActionPreview> {
  return withCampaignContentWrite(caller.actor.campaignId, () => prepared(caller, operation, raw)).catch(error => {
    if (error instanceof BattleRuleError) throw new ContentError(error.message, 422, undefined, error.params);

    if (error instanceof BattleAccessError) throw new ContentError(error.message, error.status);

    throw error;
  });
}

export async function runBattleAction(actor: Actor, operation: string, raw: unknown, expected: unknown, execution?: ActionExecutionContext): Promise<ActionResult> {
  const value = parseInput(battleActionInput, raw);

  const run = () => withCampaignContentWrite(actor.campaignId, async () => {
    const fresh = await prepareBattleAction({ actor, channel: execution?.caller.channel ?? "chat", threadId: null, tokenId: null, locale: execution?.caller.locale ?? DEFAULT_LOCALE }, operation, value);

    if (requestDigest(fresh.preconditions) !== requestDigest(expected)) throw new ContentError(API_ERRORS.BATTLE_CHANGED_PREVIEW_AGAIN, 409);

    return executeBattleOperation(actor, { operation, battleId: value.battleId ?? "", input: value.body, expectedVersion: (fresh.preconditions as { version: number }).version, serverDice: value.dice === "server" }, execution);
  });

  assertWriteScope(actor, execution);

  return execution ? runContentWriteContext(actor.campaignId, execution.db, run) : run();
}

export async function readBattleAction(actor: Actor, operation: string, raw: unknown): Promise<ActionResult> {
  const dmLoaded = operation === "summary" || operation === "get";

  if (dmLoaded) assertScope(actor, false);
  else await liveAccess(actor, false);

  const value = parseInput(battleActionInput, raw);

  const campaignId = actor.campaignId;

  if (operation === "list" || operation === "active") {
    const page = parseInput(z.object({ offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(30) }).strict(), value.body);

    const rows = await prisma.battleScene.findMany({ where: { campaignId, ...(operation === "active" && { status: "active" }) }, orderBy: { createdAt: "desc" }, skip: page.offset, take: page.limit + 1, select: { id: true, name: true, status: true, version: true } });

    const { items, nextOffset } = pageOf(rows, page.offset, page.limit);

    return result({ items, nextOffset }, campaignId);
  }

  if (operation === "balance.get" || operation === "balance") {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { rules: true } });

    if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    return result(await battleBalance(campaignId, operation === "balance" ? value.body : undefined, parseRules(campaign.rules)), campaignId);
  }

  if (!value.battleId) throw new ContentError(API_ERRORS.BATTLE_ID_REQUIRED, 400);

  if (dmLoaded) {
    const loaded = await loadDmBattle(actor, value.battleId, "Доступ заборонено");

    if (operation === "summary") return result(summarizeBattle(await loadAllEvents(prisma, loaded.scene.id), loaded.participants), loaded.scene.id);

    return result(toBattleResponse(loaded, loaded.scene, loaded.participants, loaded.pending, { mode: "full", entries: await loadRecentEvents(prisma, loaded.scene.id, 30) }, { isDM: loaded.isDM }), loaded.scene.id);
  }

  if (operation === "version") {
    const row = await battleRecord(campaignId, value.battleId, { id: true, version: true });

    return result({ version: row.version }, row.id);
  }

  if (operation === "audio.get") {
    const row = await battleRecord(campaignId, value.battleId, { id: true, audio: true });

    return result({ audio: row.audio }, row.id);
  }

  const row = await battleRecord(campaignId, value.battleId, { id: true });

  if (operation === "events") {
    const page = parseInput(z.object({ before: z.number().int().min(1), limit: z.number().int().min(1).max(100).default(30) }).strict(), value.body);

    return result(await loadEventsBefore(prisma, row.id, page), row.id);
  }

  throw new ContentError(API_ERRORS.BATTLE_UNKNOWN_OPERATION, 404);
}

export async function battleBalance(campaignId: string, input: unknown | undefined, rules: import("@/lib/utils/rules").Ruleset) {
  if (input === undefined) return (await import("@/lib/server/battles/balance/balance-get")).getBalancePayload(campaignId, rules);

  const { balanceSchema } = await import("@/lib/server/battles/balance/balance-schema");

  return (await import("@/lib/server/battles/balance/balance-post")).postBalanceResponse(campaignId, parseInput(balanceSchema, input), rules);
}
