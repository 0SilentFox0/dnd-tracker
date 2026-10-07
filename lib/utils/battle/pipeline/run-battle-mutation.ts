import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import type { PusherMessage } from "./battle-response";
import { buildPusherMessages, toBattleResponse } from "./battle-response";
import { buildClientDelta } from "./client-delta";
import { defaultPipelineDeps } from "./default-deps";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { BattleStatus } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/participants";
import type { Rng } from "@/lib/utils/abilities/engine/types";
import type { BATTLE_RATE_LIMITS, RateLimitResult } from "@/lib/utils/api/rate-limit";
import { rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/battle-victory";
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
} from "@/lib/utils/battle/store";
import type { BattleKnowledge } from "@/lib/utils/battle/view/knowledge";
import { alwaysSeesEnemyStats } from "@/lib/utils/battle/view/visibility";
import type { BattleScene } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

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
  loadRecentEvents(battleId: string, limit: number): Promise<BattleAction[]>;
  loadKnowledge?(battleId: string): Promise<BattleKnowledge>;
  rng?: Rng;
}

export interface RunBattleMutationOptions<TBody> {
  params: { id: string; battleId: string };
  access: BattleAccess;
  requireStatus?: BattleStatus | BattleStatus[];
  schema?: ZodType<TBody>;
  rateLimitScope?: keyof typeof BATTLE_RATE_LIMITS;
  dryRun?: (body: TBody) => boolean;
  respond?: "battle" | "wrapped" | "response";
  includeRecentEvents?: number;
  includeKnowledge?: boolean;
  mutate(ctx: BattleMutationContext, body: TBody): MutationResult | Promise<MutationResult>;
}

function assertAccess(access: BattleAccess, ctx: BattleMutationContext): void {
  if (access === BattleAccess.MEMBER || ctx.isDM) return;

  if (access === BattleAccess.DM) throw new BattleAccessError(403, "Лише DM");

  const current = ctx.participants[ctx.scene.turnIndex];

  if (access === BattleAccess.CURRENT_CONTROLLER) {
    if (!current || current.basicInfo.controlledBy !== ctx.userId) {
      throw new BattleRuleError("not_your_turn", "Зараз не ваш хід");
    }

    return;
  }

  if (!current || current.basicInfo.controlledBy !== ctx.userId) {
    throw new BattleRuleError("not_your_turn", "Зараз не ваш хід");
  }

  if (!isActive(current)) {
    throw new BattleRuleError("participant_dead", "Учасник не може діяти");
  }
}

function withVictory(scene: BattleSceneState, result: MutationResult): MutationResult {
  const status = result.scene?.status ?? scene.status;

  if (status !== BattleStatus.ACTIVE) return result;

  const victory = checkVictoryConditions(result.participants);

  if (!victory.result) return result;

  const round = result.scene?.round ?? scene.round;

  const { updatedParticipants, battleAction } = completeBattle(result.participants, victory.result, round);

  return {
    ...result,
    participants: updatedParticipants,
    scene: { ...result.scene, status: BattleStatus.COMPLETED, completedAt: new Date() },
    events: [...result.events, battleActionToEvent({ ...battleAction, round })],
  };
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

  if (err instanceof BattleAccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof BattleRuleError) {
    return NextResponse.json({ code: err.code, error: err.message }, { status: 422 });
  }

  console.error("[battle-pipeline] unexpected error", err);

  return NextResponse.json({ error: API_ERRORS.INTERNAL }, { status: 500 });
}

async function readBody<TBody>(req: Request, schema?: ZodType<TBody>) {
  const raw: unknown = await req.json().catch(() => undefined);

  // з сирого JSON: схема роуту може не оголошувати expectedVersion і тихо його відкинути
  const expectedVersion =
    raw && typeof raw === "object" && typeof (raw as { expectedVersion?: unknown }).expectedVersion === "number"
      ? (raw as { expectedVersion: number }).expectedVersion
      : undefined;

  if (!schema) return { ok: true as const, body: undefined as TBody, expectedVersion };

  const parsed = schema.safeParse(raw);

  return parsed.success
    ? { ok: true as const, body: parsed.data, expectedVersion }
    : { ok: false as const, issues: parsed.error.issues };
}

export async function runBattleMutation<TBody>(
  req: Request,
  options: RunBattleMutationOptions<TBody>,
  deps: PipelineDeps = defaultPipelineDeps,
): Promise<NextResponse> {
  try {
    const { id: campaignId, battleId } = options.params;

    const userId = await deps.getUserId();

    if (!userId) throw new BattleAccessError(401, API_ERRORS.UNAUTHORIZED);

    const [rate, loaded, parsed] = await Promise.all([
      options.rateLimitScope ? deps.rateLimit({ userId, scope: options.rateLimitScope, battleId }) : null,
      deps.loadBattle({ battleId, campaignId, userId }),
      readBody(req, options.schema),
    ]);

    if (rate && !rate.allowed) return rateLimitResponse(rate);

    if (!parsed.ok) {
      return NextResponse.json({ error: API_ERRORS.INVALID_BODY, issues: parsed.issues }, { status: 400 });
    }

    if (!loaded) throw new BattleAccessError(404, API_ERRORS.NOT_FOUND);

    if (!loaded.isMember) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

    const ctx: BattleMutationContext = {
      scene: loaded.scene,
      meta: loaded.meta,
      participants: loaded.participants,
      pending: loaded.pending,
      userId,
      isDM: loaded.isDM,
      ...(deps.rng && { rng: deps.rng }),
    };

    assertAccess(options.access, ctx);

    const allowed = options.requireStatus
      ? ([] as BattleStatus[]).concat(options.requireStatus)
      : null;

    if (allowed && !allowed.includes(loaded.scene.status)) {
      throw new BattleRuleError("wrong_status", `Дія недоступна в статусі «${loaded.scene.status}»`);
    }

    const expected = parsed.expectedVersion;

    if (expected !== undefined && expected !== loaded.scene.version) {
      throw new BattleConflictError(loaded.scene.version);
    }

    const result = withVictory(loaded.scene, await options.mutate(ctx, parsed.body));

    if (options.dryRun?.(parsed.body)) {
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

    const delta = await deps.saveBattle(loaded, result);

    const after: BattleSceneState = {
      ...loaded.scene,
      ...result.scene,
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
    });

    deps.publish(buildPusherMessages({ before: loaded.scene, after, participants: result.participants, delta: clientDelta }));

    return NextResponse.json({ delta: clientDelta, ...(result.response && { response: result.response }) });
  } catch (err) {
    return battleErrorResponse(err);
  }
}
