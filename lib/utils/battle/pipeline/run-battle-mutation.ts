import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import type { PusherMessage } from "./battle-response";
import { buildPusherMessages, toBattleResponse } from "./battle-response";
import { buildClientDelta } from "./client-delta";
import { defaultPipelineDeps } from "./default-deps";
import { guardTurnOrder } from "./turn-order-guard";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { BattleStatus } from "@/lib/constants/battle";
import { ContentError } from "@/lib/server/content/errors";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { syncMapAuras } from "@/lib/utils/abilities/engine/effects/map-auras";
import type { BATTLE_RATE_LIMITS, RateLimitResult } from "@/lib/utils/api/rate-limit";
import { rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { releaseInvalidGrapples } from "@/lib/utils/battle/actions/grapple";
import { controls } from "@/lib/utils/battle/common/control";
import { placeParticipants } from "@/lib/utils/battle/grid/placement";
import { placeRevived } from "@/lib/utils/battle/grid/revive-placement";
import { modeBlockedText, withModeAfterMutation } from "@/lib/utils/battle/modes/server";
import { clearFallenEffects } from "@/lib/utils/battle/participant/fallen";
import { reserveOf } from "@/lib/utils/battle/participant/reserve";
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
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/turn/victory";
import type { BattleKnowledge } from "@/lib/utils/battle/view/knowledge";
import { alwaysSeesEnemyStats } from "@/lib/utils/battle/view/visibility";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleScene } from "@/types/api";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

export { PUSHER_DELTA_LIMIT_BYTES } from "./limits";

export const BattleAccess = { DM: "dm", TURN_CONTROLLER: "turnController", CURRENT_CONTROLLER: "currentController", MEMBER: "member" } as const;

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

  if (access === BattleAccess.DM) throw new BattleAccessError(403, "Лише DM");

  const current = ctx.participants[ctx.scene.turnIndex];

  if (access === BattleAccess.CURRENT_CONTROLLER) {
    if (!controls(ctx, current)) {
      throw new BattleRuleError("not_your_turn", "Зараз не ваш хід");
    }

    return;
  }

  if (!controls(ctx, current)) {
    throw new BattleRuleError("not_your_turn", "Зараз не ваш хід");
  }

  if (!isActive(current)) {
    throw new BattleRuleError("participant_dead", "Учасник не може діяти");
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
  const cleared = clearFallenEffects(result.participants);

  if (cleared !== result.participants) result = { ...result, participants: cleared };

  const released = releaseInvalidGrapples(result.participants, map);

  if (released.participants !== result.participants) result = { ...result, participants: released.participants, events: [...result.events, systemEvent(result.scene?.round ?? scene.round, released.messages.join("; "))] };

  if (!map || (result.scene?.status ?? scene.status) !== BattleStatus.ACTIVE) return result;

  const placed = place ? placeParticipants(map, placeRevived(map, scene.participants, result.participants)) : result.participants;

  const participants = syncMapAuras(placed, map);

  return participants === result.participants ? result : { ...result, participants };
}

function respondWith(
  mode: "battle" | "wrapped" | "response" | undefined,
  battle: BattleScene,
  response?: Record<string, unknown>,
): NextResponse {
  if (mode === "response") return NextResponse.json(response ?? {});

  if (mode === "wrapped") return NextResponse.json({ battle, ...response });

  return NextResponse.json({ ...battle, ...response });
}

export function battleErrorResponse(err: unknown): NextResponse {
  if (err instanceof BattleConflictError) {
    return NextResponse.json({ code: "conflict", error: err.message, version: err.currentVersion }, { status: 409 });
  }

  if (err instanceof BattleAccessError || err instanceof ContentError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof BattleRuleError) {
    return NextResponse.json({ code: err.code, error: err.message }, { status: 422 });
  }

  console.error("[battle-pipeline] unexpected error", err);

  return NextResponse.json({ error: API_ERRORS.INTERNAL }, { status: 500 });
}

export type NamedBattleMutationOptions = { params: RunBattleMutationOptions<unknown>["params"]; operation: string };

export async function runBattleMutation<TBody>(
  req: Request,
  supplied: RunBattleMutationOptions<TBody> | NamedBattleMutationOptions,
  deps: PipelineDeps = defaultPipelineDeps,
): Promise<NextResponse> {
  try {
    const userId = await deps.getUserId();

    if (!userId) throw new BattleAccessError(401, API_ERRORS.UNAUTHORIZED);

    const options = "mutate" in supplied ? supplied : {
      ...await (await import("@/lib/server/battles/operations")).getBattleOperation(supplied.operation, supplied.params),
      ...supplied,
    };

    const raw: unknown = await req.json().catch(() => undefined);

    const expectedVersion = raw && typeof raw === "object" && typeof (raw as { expectedVersion?: unknown }).expectedVersion === "number"
      ? (raw as { expectedVersion: number }).expectedVersion : undefined;

    const run = () => runGuardedBattleOperation(userId, raw, expectedVersion, options as RunBattleMutationOptions<unknown>, deps);

    return await (deps.withWrite ? deps.withWrite(options.params.id, run) : run());
  } catch (err) {
    return battleErrorResponse(err);
  }
}

/** Shared guard/mutation/save pipeline. Errors escape the transaction boundary. */
export async function runGuardedBattleOperation<TBody>(
  userId: string,
  raw: unknown,
  expectedVersion: number | undefined,
  options: RunBattleMutationOptions<TBody>,
  deps: PipelineDeps,
): Promise<NextResponse> {
  const { id: campaignId, battleId } = options.params;

  const [rate, loaded] = await Promise.all([
    options.rateLimitScope ? deps.rateLimit({ userId, scope: options.rateLimitScope, battleId }) : null,
    deps.loadBattle({ battleId, campaignId, userId }),
  ]);

  if (rate && !rate.allowed) return rateLimitResponse(rate);

  const parsed = options.schema ? options.schema.safeParse(raw) : { success: true as const, data: undefined as TBody };

  if (!parsed.success) return NextResponse.json({ error: API_ERRORS.INVALID_BODY, issues: parsed.error.issues }, { status: 400 });

  const body = parsed.data;

  if (!loaded) throw new BattleAccessError(404, API_ERRORS.NOT_FOUND);

  if (!loaded.isMember) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  const ctx = guardBattleContext(userId, loaded, body, expectedVersion, options, deps.rng);

  const awaitedBefore = loaded.scene.status === BattleStatus.ACTIVE && checkVictoryConditions(loaded.participants, reserveOf(loaded.pending)).awaiting !== null;

  const mutated = guardTurnOrder(loaded.scene, loaded.participants, await options.mutate(ctx, body), options.operation);

  const isDryRun = options.dryRun?.(body) ?? false;

  const map = mutated.scene?.map !== undefined ? mutated.scene.map : loaded.meta.map;

  const placed = withPlacement(map, { status: loaded.scene.status, round: loaded.scene.round, participants: loaded.participants }, mutated, !isDryRun);

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

    return respondWith(options.respond, knowledge ? { ...battle, knowledge } : battle, result.response);
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

  deps.publish(buildPusherMessages({ before: loaded.scene, after, participants: result.participants, pending: result.pending, wasAwaiting: awaitedBefore, delta: clientDelta }));

  return NextResponse.json({ delta: clientDelta, ...(result.response && { response: result.response }) });
}

/** Read-only guards shared by intent preview and execution; never invokes a mutation. */
export function guardBattleContext<TBody>(userId: string, loaded: LoadedBattle & { isMember: boolean }, body: TBody, expectedVersion: number | undefined, options: RunBattleMutationOptions<TBody>, rng?: Rng): BattleMutationContext {
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

  const allowed = options.requireStatus
    ? ([] as BattleStatus[]).concat(options.requireStatus)
    : null;

  if (allowed && !allowed.includes(loaded.scene.status)) {
    throw new BattleRuleError("wrong_status", `Дія недоступна в статусі «${loaded.scene.status}»`);
  }

  const blocked = options.blockedByMode ? modeBlockedText(loaded.meta.map) : null;

  if (blocked && !options.dryRun?.(body)) {
    throw new BattleRuleError("action_rejected", blocked);
  }

  if (
    loaded.scene.status === BattleStatus.ACTIVE &&
    !options.allowWhileAwaitingDm &&
    !options.dryRun?.(body) &&
    checkVictoryConditions(loaded.participants, reserveOf(loaded.pending)).awaiting
  ) {
    throw new BattleRuleError("awaiting_dm", API_ERRORS.BATTLE_AWAITING_DM);
  }

  const expected = expectedVersion;

  if (expected !== undefined && expected !== loaded.scene.version) {
    throw new BattleConflictError(loaded.scene.version);
  }

  return ctx;
}

/** Record commands (create/delete/audio) share T10's transaction and live access boundary.
 * They cannot use saveBattle: creation has no scene, deletion removes it, audio has its own seq.
 */
export async function runGuardedBattleRecordOperation<T>(
  actor: import("@/lib/utils/api/actor").Actor,
  callback: () => Promise<T>,
  execution?: import("@/lib/server/assistant/types").ActionExecutionContext,
): Promise<T> {
  const { needFailure } = await import("@/lib/utils/api/need");

  const { prisma } = await import("@/lib/db");

  const { withCampaignContentWrite } = await import("@/lib/server/content/write");

  const { currentContentWrite, runContentWriteContext } = await import("@/lib/server/content/write-context");

  const failure = needFailure(actor, { access: "dm", scope: "battles:write" });

  if (failure) throw new ContentError(failure, 403);

  const current = currentContentWrite();

  if ((execution && (execution.caller.actor.userId !== actor.userId || execution.caller.actor.campaignId !== actor.campaignId)) || (current && (current.campaignId !== actor.campaignId || (execution && current.db !== execution.db)))) throw new ContentError("Невідповідна транзакція", 403);

  const run = () => withCampaignContentWrite(actor.campaignId, async () => {
    const member = await prisma.campaignMember.findUnique({ where: { campaignId_userId: { campaignId: actor.campaignId, userId: actor.userId } } });

    if (member?.role !== "dm") throw new ContentError("Лише DM", 403);

    return callback();
  });

  return execution ? runContentWriteContext(actor.campaignId, execution.db, run) : run();
}
