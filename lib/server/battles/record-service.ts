import { after } from "next/server";
import { type BattleScene, Prisma } from "@prisma/client";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { BATTLE_AUDIO_EVENT, battleChannelName } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import { battleMapSchema, createBattleSchema } from "@/lib/schemas";
import { battleAudioCommandSchema } from "@/lib/schemas/music";
import type { ActionExecutionContext } from "@/lib/server/assistant/types";
import { loadAudioLibrary } from "@/lib/server/audio/track-store";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { clearShowBattle } from "@/lib/server/show/show-store";
import { resolveMapBackgroundForPersistence } from "@/lib/supabase/battle-map-storage";
import { BATTLE_RATE_LIMITS, checkRateLimit, type RateLimitResult } from "@/lib/utils/api/rate-limit";
import { applyAudioCommand, commandNeedsLibrary } from "@/lib/utils/audio/audio-command";
import type { BattleAudioState } from "@/types/audio";

export class BattleAudioRateLimitError extends ContentError {
  constructor(readonly rate: RateLimitResult) { super(API_ERRORS.TOO_MANY_REQUESTS, 429); }
}

export const patchBattleSchema = z.object({ name: z.string().min(1).optional(), description: z.string().nullable().optional(), participants: createBattleSchema.shape.participants.optional(), map: battleMapSchema.nullable().optional() }).strict();
export const recordSchemas = { create: createBattleSchema, patch: patchBattleSchema, delete: z.object({}).strict(), "clear-history": z.object({}).strict(), audio: battleAudioCommandSchema };
export type RecordOperation = keyof typeof recordSchemas;

export function requireBattleId(id: string | undefined): string {
  if (!id) throw new ContentError(API_ERRORS.BATTLE_ID_REQUIRED, 400);

  return id;
}

export async function battleRecord(campaignId: string, battleId: string): Promise<BattleScene>;
export async function battleRecord<S extends Prisma.BattleSceneSelect>(campaignId: string, battleId: string, select: S): Promise<Prisma.BattleSceneGetPayload<{ select: S }>>;
export async function battleRecord(campaignId: string, battleId: string, select?: Prisma.BattleSceneSelect): Promise<unknown> {
  const row = await prisma.battleScene.findUnique({ where: { id: battleId }, ...(select && { select: { ...select, campaignId: true } }) });

  if (!row || row.campaignId !== campaignId) throw new ContentError(API_ERRORS.BATTLE_NOT_FOUND, 404);

  return row;
}

async function mapForWrite(map: z.infer<typeof battleMapSchema> | null | undefined, campaignId: string, current?: Prisma.JsonValue) {
  if (!map) return map;

  const previous = current && typeof current === "object" && !Array.isArray(current) && typeof current.background === "string" ? current.background : null;

  const bg = await resolveMapBackgroundForPersistence(map.background, { campaignId, current: previous });

  if (!bg.ok) throw new ContentError(bg.message, 400);

  return { ...map, background: bg.background ?? null };
}

/** HTTP uploads keep their established lifecycle outside the database lock. */
export async function prepareHttpBattleRecord(campaignId: string, operation: RecordOperation, battleId: string | undefined, raw: unknown): Promise<unknown> {
  const data = parseInput(recordSchemas[operation] as z.ZodType, raw) as Record<string, unknown>;

  if ((operation !== "create" && operation !== "patch") || !data.map) return data;

  const row = operation === "patch" ? await battleRecord(campaignId, requireBattleId(battleId)) : null;

  return { ...data, map: await mapForWrite(data.map as z.infer<typeof battleMapSchema>, campaignId, row?.map) };
}

/** Called only inside runGuardedBattleRecordOperation, by HTTP and assistant alike. */
export async function writeBattleRecord(campaignId: string, userId: string, operation: RecordOperation, battleId: string | undefined, raw: unknown, execution?: ActionExecutionContext, preparedMap = false) {
  const input = parseInput(recordSchemas[operation] as z.ZodType, raw);

  if (operation === "create") {
    const data = input as z.infer<typeof createBattleSchema>;

    const map = preparedMap ? data.map : await mapForWrite(data.map, campaignId);

    return prisma.battleScene.create({ data: { campaignId, name: data.name, description: data.description, status: "prepared", participants: data.participants as unknown as Prisma.InputJsonValue, currentRound: 1, currentTurnIndex: 0, ...(map && { map }) } });
  }

  if (operation === "clear-history" || operation === "delete") {
    const rows = operation === "delete" ? [await battleRecord(campaignId, requireBattleId(battleId))] : await prisma.battleScene.findMany({ where: { campaignId }, select: { id: true } });

    const result = await prisma.battleScene.deleteMany({ where: { campaignId, id: { in: rows.map(row => row.id) } } });

    for (const row of rows) {
      if (execution) execution.afterCommit({ key: `${execution.intentId}:battle-delete:${row.id}`, kind: "invalidate", payload: { campaignId, battleId: row.id, battleLeftActive: true } });

    }

    if (!execution) afterContentCommit(() => after(async () => { for (const row of rows) await clearShowBattle(campaignId, row.id); }));

    return operation === "delete" ? { success: true } : { success: true, deletedCount: result.count };
  }

  const row = operation === "audio" ? await prisma.battleScene.findFirst({ where: { id: requireBattleId(battleId), campaignId } }) : await battleRecord(campaignId, requireBattleId(battleId));

  if (!row) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

  if (operation === "patch") {
    const { map: rawMap, ...rest } = input as z.infer<typeof patchBattleSchema>;

    const map = preparedMap ? rawMap : await mapForWrite(rawMap, campaignId, row.map);

    await prisma.battleScene.update({ where: { id: row.id, version: row.version }, data: { ...rest, ...(rest.participants && { participants: rest.participants as unknown as Prisma.InputJsonValue }), ...(map !== undefined && { map: map ?? Prisma.DbNull }), version: { increment: 1 } } });

    return { id: row.id, version: row.version + 1 };
  }

  const rate = await checkRateLimit({ userId, scope: "audio", battleId: row.id, ...BATTLE_RATE_LIMITS.audio });

  if (!rate.allowed) throw new BattleAudioRateLimitError(rate);

  const cmd = input as z.infer<typeof battleAudioCommandSchema>;

  const prev = row.audio as BattleAudioState | null;

  const result = applyAudioCommand(prev, cmd, { now: Date.now(), library: commandNeedsLibrary(cmd) ? await loadAudioLibrary(campaignId) : [] });

  if (!result.ok) throw new ContentError(result.message, 422);

  const next = result.value;

  const { count } = await prisma.battleScene.updateMany({ where: { id: row.id, campaignId, audio: prev ? { path: ["seq"], equals: prev.seq } : { equals: Prisma.DbNull } }, data: { audio: next as unknown as Prisma.InputJsonValue } });

  if (!count) throw new ContentError(API_ERRORS.BATTLE_AUDIO_CONFLICT, 409);

  const message = { channel: battleChannelName(row.id), event: BATTLE_AUDIO_EVENT, payload: { battleId: row.id, audio: next } };

  if (execution) execution.afterCommit({ key: `${execution.intentId}:battle-audio`, kind: "publish", payload: JSON.parse(JSON.stringify({ battleMessages: [message] })) });
  else afterContentCommit(() => after(() => safePusherTrigger(pusherServer, message.channel, message.event, message.payload, { action: "battle audio" })));

  return { audio: next };
}
