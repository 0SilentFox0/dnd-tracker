import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { defaultPipelineDeps } from "./default-deps";
import { toApiBattle } from "./to-api-battle";

import type { BATTLE_RATE_LIMITS, RateLimitResult } from "@/lib/utils/api/rate-limit";
import { rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { checkVictoryConditions, completeBattle } from "@/lib/utils/battle/battle-victory";
import type {
  BattleDelta,
  BattleMutationOutcome,
  BattleSceneState,
  BattleStatus,
  LoadedBattle,
} from "@/lib/utils/battle/store";
import { BattleAccessError, BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

export const PUSHER_DELTA_LIMIT_BYTES = 9_500;

export type BattleAccess = "dm" | "turnController" | "member";

export interface BattleMutationContext {
  scene: BattleSceneState;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  userId: string;
  isDM: boolean;
}

export interface MutationResult extends BattleMutationOutcome {
  response?: Record<string, unknown>;
}

type RefetchPayload = { battleId: string; version: number; refetch: true };

export interface PipelineDeps {
  getUserId(): Promise<string | null>;
  rateLimit(input: { userId: string; scope: keyof typeof BATTLE_RATE_LIMITS; battleId: string }): Promise<RateLimitResult>;
  loadBattle(args: { battleId: string; campaignId: string; userId: string }): Promise<(LoadedBattle & { isMember: boolean }) | null>;
  saveBattle(before: LoadedBattle, outcome: BattleMutationOutcome): Promise<BattleDelta>;
  publish(battleId: string, payload: BattleDelta | RefetchPayload): void;
}

export interface RunBattleMutationOptions<TBody> {
  params: { id: string; battleId: string };
  access: BattleAccess;
  requireStatus?: BattleStatus | BattleStatus[];
  schema?: ZodType<TBody>;
  rateLimitScope?: keyof typeof BATTLE_RATE_LIMITS;
  mutate(ctx: BattleMutationContext, body: TBody): MutationResult | Promise<MutationResult>;
}

function assertAccess(access: BattleAccess, ctx: BattleMutationContext): void {
  if (access === "member" || ctx.isDM) return;

  if (access === "dm") throw new BattleAccessError(403, "Лише DM");

  const current = ctx.participants[ctx.scene.turnIndex];

  if (!current || current.basicInfo.controlledBy !== ctx.userId) {
    throw new BattleRuleError("not_your_turn", "Зараз не ваш хід");
  }

  if (current.combatStats.status !== "active") {
    throw new BattleRuleError("participant_dead", "Учасник не може діяти");
  }
}

function withVictory(scene: BattleSceneState, result: MutationResult): MutationResult {
  const status = result.scene?.status ?? scene.status;

  if (status !== "active") return result;

  const victory = checkVictoryConditions(result.participants);

  if (!victory.result) return result;

  const round = result.scene?.round ?? scene.round;

  const { updatedParticipants, battleAction } = completeBattle(result.participants, victory.result, round);

  return {
    ...result,
    participants: updatedParticipants,
    scene: { ...result.scene, status: "completed", completedAt: new Date() },
    events: [
      ...result.events,
      { type: "battle_end", round, resultText: battleAction.resultText, hpChanges: battleAction.hpChanges },
    ],
  };
}

function errorResponse(err: unknown): NextResponse {
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

  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

async function readBody<TBody>(req: Request, schema?: ZodType<TBody>) {
  if (!schema) return { ok: true as const, body: undefined as TBody };

  const raw = await req.json().catch(() => undefined);

  const parsed = schema.safeParse(raw);

  return parsed.success
    ? { ok: true as const, body: parsed.data }
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

    if (!userId) throw new BattleAccessError(401, "Unauthorized");

    const [rate, loaded, parsed] = await Promise.all([
      options.rateLimitScope ? deps.rateLimit({ userId, scope: options.rateLimitScope, battleId }) : null,
      deps.loadBattle({ battleId, campaignId, userId }),
      readBody(req, options.schema),
    ]);

    if (rate && !rate.allowed) return rateLimitResponse(rate);

    if (!parsed.ok) {
      return NextResponse.json({ error: "invalid_body", issues: parsed.issues }, { status: 400 });
    }

    if (!loaded) throw new BattleAccessError(404, "Not found");

    if (!loaded.isMember) throw new BattleAccessError(403, "Forbidden");

    const ctx: BattleMutationContext = {
      scene: loaded.scene,
      participants: loaded.participants,
      pending: loaded.pending,
      userId,
      isDM: loaded.isDM,
    };

    assertAccess(options.access, ctx);

    const allowed = options.requireStatus
      ? ([] as BattleStatus[]).concat(options.requireStatus)
      : null;

    if (allowed && !allowed.includes(loaded.scene.status)) {
      throw new BattleRuleError("wrong_status", `Дія недоступна в статусі «${loaded.scene.status}»`);
    }

    const expected = (parsed.body as { expectedVersion?: unknown } | undefined)?.expectedVersion;

    if (typeof expected === "number" && expected !== loaded.scene.version) {
      throw new BattleConflictError(loaded.scene.version);
    }

    const result = withVictory(loaded.scene, await options.mutate(ctx, parsed.body));

    const delta = await deps.saveBattle(loaded, result);

    const nextScene = { ...loaded.scene, ...result.scene, version: delta.version };

    const payload =
      JSON.stringify(delta).length > PUSHER_DELTA_LIMIT_BYTES
        ? { battleId, version: delta.version, refetch: true as const }
        : delta;

    deps.publish(battleId, payload);

    return NextResponse.json({
      battle: toApiBattle(nextScene, result.participants, result.pending),
      delta,
      ...result.response,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
