import { NextResponse } from "next/server";

import { getBattleOperation } from "./operations";
import { defaultPipelineDeps } from "./pipeline-deps";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { ContentError } from "@/lib/server/content/errors";
import { rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { apiErrorJson } from "@/lib/utils/api/translate-error";
import type { BattleOperationOutcome, PipelineDeps, RunBattleMutationOptions } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleOperationError, runGuardedBattleOperationCore } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";

export type NamedBattleMutationOptions = { params: RunBattleMutationOptions<unknown>["params"]; operation: string };

function respondWith(mode: "battle" | "wrapped" | "response" | undefined, outcome: BattleOperationOutcome): NextResponse {
  const { preview: battle, response } = outcome;

  if (!battle) return NextResponse.json({ delta: outcome.delta, ...(response && { response }) });

  if (mode === "response") return NextResponse.json(response ?? {});

  if (mode === "wrapped") return NextResponse.json({ battle, ...response });

  return NextResponse.json({ ...battle, ...response });
}

export function battleErrorResponse(err: unknown): NextResponse {
  if (err instanceof BattleOperationError) {
    if (err.rate) return rateLimitResponse(err.rate);

    return apiErrorJson({ error: err.message, issues: err.issues }, { status: err.status });
  }

  if (err instanceof BattleConflictError) {
    return apiErrorJson({ code: "conflict", error: err.message, version: err.currentVersion }, { status: 409 });
  }

  if (err instanceof BattleAccessError) return apiErrorJson({ error: err.message }, { status: err.status });

  if (err instanceof ContentError) return apiErrorJson({ error: err.message, params: err.params }, { status: err.status });

  if (err instanceof BattleRuleError) {
    return apiErrorJson({ code: err.code, error: err.message, params: err.params }, { status: 422 });
  }

  console.error("[battle-pipeline] unexpected error", err);

  return apiErrorJson({ error: API_ERRORS.INTERNAL }, { status: 500 });
}

export async function runBattleMutation<TBody>(
  req: Request,
  supplied: RunBattleMutationOptions<TBody> | NamedBattleMutationOptions,
  deps: PipelineDeps = defaultPipelineDeps,
): Promise<NextResponse> {
  try {
    const userId = await deps.getUserId();

    if (!userId) throw new BattleAccessError(401, API_ERRORS.UNAUTHORIZED);

    const options = "mutate" in supplied ? supplied : {
      ...await getBattleOperation(supplied.operation, supplied.params),
      ...supplied,
    };

    const raw: unknown = await req.json().catch(() => undefined);

    const expectedVersion = raw && typeof raw === "object" && typeof (raw as { expectedVersion?: unknown }).expectedVersion === "number"
      ? (raw as { expectedVersion: number }).expectedVersion : undefined;

    const write = { logLocale: await (deps.logLocale ?? getRequestLocale)() };

    const run = async () => respondWith(options.respond, await runGuardedBattleOperationCore(userId, raw, expectedVersion, options as RunBattleMutationOptions<unknown>, deps, write));

    return await (deps.withWrite ? deps.withWrite(options.params.id, run) : run());
  } catch (err) {
    return battleErrorResponse(err);
  }
}
