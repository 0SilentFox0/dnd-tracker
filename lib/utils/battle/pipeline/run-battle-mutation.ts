import type { ZodType } from "zod";

import type { PusherMessage } from "./battle-response";
import { buildPusherMessages, toBattleResponse } from "./battle-response";
import { buildClientDelta } from "./client-delta";
import { guardTurnOrder } from "./turn-order-guard";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { BattleStatus } from "@/lib/constants/battle";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { syncMapAuras } from "@/lib/utils/abilities/engine/effects/map-auras";
import type { BATTLE_RATE_LIMITS, RateLimitResult } from "@/lib/utils/api/rate-limit";
import { releaseInvalidGrapples } from "@/lib/utils/battle/actions/grapple";
import { controls, currentOf } from "@/lib/utils/battle/common/control";
import { dropOrphanedConcentration } from "@/lib/utils/battle/concentration";
import { placeParticipants } from "@/lib/utils/battle/grid/placement";
import { placeRevived } from "@/lib/utils/battle/grid/revive-placement";
import { modeBlockedText, withModeAfterMutation } from "@/lib/utils/battle/modes/server";
import { clearFallenEffects } from "@/lib/utils/battle/participant/fallen";
import { reserveOf } from "@/lib/utils/battle/participant/reserve";
import { sweepOrphanedAnchored } from "@/lib/utils/battle/spell/anchored-zone";
import { sweepDeadZones } from "@/lib/utils/battle/spell/zone-triggers";
import type {
  BattleDelta,
  BattleMeta,
  BattleMutationOutcome,
  BattleSceneState,
  LoadedBattle,
} from "@/lib/utils/battle/store";
import {
  BattleAccessError,
  battleActionToEvent,
  BattleConflictError,
  BattleRuleError,
  eventToBattleAction,
  systemEvent,
} from "@/lib/utils/battle/store";
import { dismissExpiredSummons } from "@/lib/utils/battle/summon/dismiss";
import { revertExpiredTransforms } from "@/lib/utils/battle/transform/revert";
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/turn/victory";
import type { BattleKnowledge } from "@/lib/utils/battle/view/knowledge";
import { alwaysSeesEnemyStats } from "@/lib/utils/battle/view/visibility";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleScene, ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

export { PUSHER_DELTA_LIMIT_BYTES } from "./limits";

export const BattleAccess = { DM: "dm", CURRENT_CONTROLLER: "currentController", MEMBER: "member" } as const;

export type BattleAccess = (typeof BattleAccess)[keyof typeof BattleAccess];

export interface BattleMutationContext {
  scene: BattleSceneState;
  meta: BattleMeta;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  userId: string;
  isDM: boolean;
  rng?: Rng;
}

export interface MutationResult extends BattleMutationOutcome {
  response?: Record<string, unknown>;
}

export interface PipelineDeps {
  getUserId(): Promise<string | null>;
  rateLimit(input: { userId: string; scope: keyof typeof BATTLE_RATE_LIMITS; battleId: string }): Promise<RateLimitResult>;
  loadBattle(args: { battleId: string; campaignId: string; userId: string }): Promise<(LoadedBattle & { isMember: boolean }) | null>;
  saveBattle(before: LoadedBattle, outcome: BattleMutationOutcome): Promise<BattleDelta>;
  publish(messages: PusherMessage[]): void;
  onLeftActive?(campaignId: string, battleId: string): void;
  loadRecentEvents(battleId: string, limit: number): Promise<BattleAction[]>;
  loadKnowledge?(battleId: string): Promise<BattleKnowledge>;
  withWrite?<T>(campaignId: string, callback: () => Promise<T>): Promise<T>;
  recheckAccess?(args: { battleId: string; campaignId: string; userId: string }): Promise<{ isMember: boolean; isDM: boolean } | null>;
  rng?: Rng;
}

export interface RunBattleMutationOptions<TBody> {
  params: { id: string; battleId: string; participantId?: string };
  operation?: string;
  access: BattleAccess;
  requireStatus?: BattleStatus | BattleStatus[];
  allowWhileAwaitingDm?: boolean;
  allowWhileCritPending?: boolean;
  schema?: ZodType<TBody>;
  rateLimitScope?: keyof typeof BATTLE_RATE_LIMITS;
  dryRun?: (body: TBody) => boolean;
  respond?: "battle" | "wrapped" | "response";
  includeRecentEvents?: number;
  includeKnowledge?: boolean;
  blockedByMode?: boolean;
  mutate(ctx: BattleMutationContext, body: TBody): MutationResult | Promise<MutationResult>;
}

export function assertAccess(access: BattleAccess, ctx: BattleMutationContext): void {
  if (access === BattleAccess.MEMBER || ctx.isDM) return;

  if (access === BattleAccess.DM) throw new BattleAccessError(403, API_ERRORS.DM_ONLY);

  if (!controls(ctx, currentOf(ctx))) {
    throw new BattleRuleError("not_your_turn", API_ERRORS.BATTLE_NOT_YOUR_TURN);
  }
}

function withVictory(scene: BattleSceneState, result: MutationResult, rules: Ruleset): MutationResult {
  const status = result.scene?.status ?? scene.status;

  if (status !== BattleStatus.ACTIVE) return result;

  const victory = checkVictoryConditions(result.participants, reserveOf(result.pending));

  if (!victory.result) return result;

  const round = result.scene?.round ?? scene.round;

  const { updatedParticipants, battleAction } = completeBattle(result.participants, victory.result, round, rules);

  return {
    ...result,
    participants: updatedParticipants,
    scene: { ...result.scene, status: BattleStatus.COMPLETED, completedAt: new Date() },
    events: [...result.events, battleActionToEvent({ ...battleAction, round })],
  };
}

function withPlacement(map: BattleMapConfig | null, scene: { status: BattleStatus; round: number; participants: BattleParticipant[] }, result: MutationResult, place: boolean): MutationResult {
  const dismissed = dismissExpiredSummons(result.participants, result.scene?.round ?? scene.round);

  if (dismissed.participants !== result.participants) result = { ...result, participants: dismissed.participants, events: [...result.events, systemEvent(result.scene?.round ?? scene.round, dismissed.messages.join("; "))] };

  const reverted = revertExpiredTransforms(result.participants, result.scene?.round ?? scene.round);

  if (reverted.participants !== result.participants) result = { ...result, participants: reverted.participants, events: [...result.events, systemEvent(result.scene?.round ?? scene.round, reverted.messages.join("; "))] };

  const cleared = clearFallenEffects(result.participants);

  if (cleared !== result.participants) result = { ...result, participants: cleared };

  const released = releaseInvalidGrapples(result.participants, map);

  if (released.participants !== result.participants) result = { ...result, participants: released.participants, events: [...result.events, systemEvent(result.scene?.round ?? scene.round, released.messages.join("; "))] };

  const swept = sweepOrphanedAnchored(result.participants);

  if (swept !== result.participants) result = { ...result, participants: swept };

  const orphaned = dropOrphanedConcentration(result.participants);

  if (orphaned.participants !== result.participants) result = { ...result, participants: orphaned.participants, events: [...result.events, systemEvent(result.scene?.round ?? scene.round, orphaned.messages.join("; "))] };

  if (!map || (result.scene?.status ?? scene.status) !== BattleStatus.ACTIVE) return result;

  const placed = place ? placeParticipants(map, placeRevived(map, scene.participants, result.participants)) : result.participants;

  const participants = syncMapAuras(placed, map);

  return participants === result.participants ? result : { ...result, participants };
}

export class BattleOperationError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues?: unknown,
    readonly rate?: RateLimitResult,
  ) {
    super(message);
    this.name = "BattleOperationError";
  }
}

export type BattleOperationOutcome = {
  delta: ClientBattleDelta | null;
  version: number;
  response?: Record<string, unknown>;
  preview?: BattleScene & { knowledge?: BattleKnowledge };
};

/** Shared guard/mutation/save pipeline. Errors escape the transaction boundary. */
export async function runGuardedBattleOperationCore<TBody>(
  userId: string,
  raw: unknown,
  expectedVersion: number | undefined,
  options: RunBattleMutationOptions<TBody>,
  deps: PipelineDeps,
): Promise<BattleOperationOutcome> {
  const { id: campaignId, battleId } = options.params;

  const [rate, loaded] = await Promise.all([
    options.rateLimitScope ? deps.rateLimit({ userId, scope: options.rateLimitScope, battleId }) : null,
    deps.loadBattle({ battleId, campaignId, userId }),
  ]);

  if (rate && !rate.allowed) throw new BattleOperationError(429, API_ERRORS.TOO_MANY_REQUESTS, undefined, rate);

  const parsed = options.schema ? options.schema.safeParse(raw) : { success: true as const, data: undefined as TBody };

  if (!parsed.success) throw new BattleOperationError(400, API_ERRORS.INVALID_BODY, parsed.error.issues);

  const body = parsed.data;

  if (!loaded) throw new BattleAccessError(404, API_ERRORS.NOT_FOUND);

  if (!loaded.isMember) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  const { ctx, awaiting, isDryRun } = guardBattleContext(userId, loaded, body, expectedVersion, options, deps.rng);

  const mutated = guardTurnOrder(loaded.scene, loaded.participants, await options.mutate(ctx, body), options.operation);

  const mutatedMap = mutated.scene?.map !== undefined ? mutated.scene.map : loaded.meta.map;

  const unswept = withPlacement(mutatedMap, { status: loaded.scene.status, round: loaded.scene.round, participants: loaded.participants }, mutated, !isDryRun);

  const swept = sweepDeadZones(mutatedMap, unswept.participants);

  const map = swept ?? mutatedMap;

  const placed = swept ? { ...unswept, scene: { ...unswept.scene, map: swept } } : unswept;

  const result = withVictory(loaded.scene, isDryRun ? placed : withModeAfterMutation(map, loaded.scene, placed), loaded.meta.rules);

  if (isDryRun) {
    const needsKnowledge = options.includeKnowledge && !loaded.isDM && !alwaysSeesEnemyStats(loaded.participants, userId);

    const [entries, knowledge] = await Promise.all([
      options.includeRecentEvents ? deps.loadRecentEvents(battleId, options.includeRecentEvents) : [],
      needsKnowledge ? deps.loadKnowledge?.(battleId) : undefined,
    ]);

    const battle = toBattleResponse(
      loaded,
      loaded.scene,
      result.participants,
      result.pending,
      { mode: "full", entries },
      { isDM: loaded.isDM },
    );

    return { delta: null, version: loaded.scene.version, response: result.response, preview: knowledge ? { ...battle, knowledge } : battle };
  }

  const access = deps.recheckAccess
    ? await deps.recheckAccess({ battleId, campaignId, userId })
    : await deps.loadBattle({ battleId, campaignId, userId });

  if (!access?.isMember || access.isDM !== loaded.isDM) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  const delta = await deps.saveBattle(loaded, result);

  const { map: _map, ...scenePatch } = result.scene ?? {};

  const after: BattleSceneState = {
    ...loaded.scene,
    ...scenePatch,
    version: delta.version,
    eventSeq: delta.events.at(-1)?.seq ?? loaded.scene.eventSeq,
  };

  const entries = delta.events.map((e) => eventToBattleAction(e, battleId));

  // clear (reset/start) нумерує події з 1 — клієнт має відкинути весь старий журнал
  const cancelledFrom = !result.history
    ? undefined
    : "cancelFromSeq" in result.history
      ? result.history.cancelFromSeq
      : 0;

  // одне читання на сервері замість повного GET у кожного гравця після відкату
  const knowledge = cancelledFrom === undefined ? undefined : cancelledFrom === 0 ? {} : await deps.loadKnowledge?.(battleId);

  const clientDelta = buildClientDelta({
    before: loaded,
    after,
    participants: result.participants,
    pending: result.pending,
    stored: delta.upserted,
    fullIds: delta.fullIds,
    log: entries,
    cancelledFrom,
    knowledge,
    map: result.scene?.map,
  });

  if (loaded.scene.status === BattleStatus.ACTIVE && after.status !== BattleStatus.ACTIVE) deps.onLeftActive?.(campaignId, battleId);

  deps.publish(buildPusherMessages({ before: loaded.scene, after, participants: result.participants, pending: result.pending, wasAwaiting: awaiting !== null, delta: clientDelta }));

  return { delta: clientDelta, version: clientDelta.version, ...(result.response && { response: result.response }) };
}

/** Read-only guards shared by intent preview and execution; never invokes a mutation. */
export function guardBattleContext<TBody>(userId: string, loaded: LoadedBattle & { isMember: boolean }, body: TBody, expectedVersion: number | undefined, options: RunBattleMutationOptions<TBody>, rng?: Rng): { ctx: BattleMutationContext; awaiting: "victory" | "defeat" | null; isDryRun: boolean } {
  const ctx: BattleMutationContext = {
    scene: loaded.scene,
    meta: loaded.meta,
    participants: loaded.participants,
    pending: loaded.pending,
    userId,
    isDM: loaded.isDM,
    ...(rng && { rng: rng }),
  };

  assertAccess(options.access, ctx);

  if (expectedVersion !== undefined && expectedVersion !== loaded.scene.version) {
    throw new BattleConflictError(loaded.scene.version);
  }

  const isDryRun = options.dryRun?.(body) ?? false;

  const awaiting = loaded.scene.status === BattleStatus.ACTIVE ? checkVictoryConditions(loaded.participants, reserveOf(loaded.pending)).awaiting : null;

  const allowed = options.requireStatus
    ? ([] as BattleStatus[]).concat(options.requireStatus)
    : null;

  if (allowed && !allowed.includes(loaded.scene.status)) {
    throw new BattleRuleError("wrong_status", `Дія недоступна в статусі «${loaded.scene.status}»`);
  }

  const blocked = options.blockedByMode ? modeBlockedText(loaded.meta.map) : null;

  if (blocked && !isDryRun) {
    throw new BattleRuleError("action_rejected", blocked);
  }

  if (awaiting && !options.allowWhileAwaitingDm && !isDryRun) {
    throw new BattleRuleError("awaiting_dm", API_ERRORS.BATTLE_AWAITING_DM);
  }

  if (loaded.scene.pendingCritChoice && !options.allowWhileCritPending && !isDryRun) {
    throw new BattleRuleError("crit_pending", API_ERRORS.CRIT_PENDING);
  }

  return { ctx, awaiting, isDryRun };
}
