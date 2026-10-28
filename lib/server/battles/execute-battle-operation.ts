import type { Prisma } from "@prisma/client";

import { schemaDiceInput, withServerBattleDice } from "./dice";
import { assertWriteScope } from "./guards";
import { getBattleOperation } from "./operations";
import { defaultPipelineDeps, scopedPipelineDeps } from "./pipeline-deps";
import { runGuardedBattleRecordOperation } from "./record-operation";
import { battleRecord, type RecordOperation, writeBattleRecord } from "./record-service";

import type { ActionExecutionContext, ActionResult } from "@/lib/server/assistant/types";
import { ContentError } from "@/lib/server/content/errors";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import type { Actor } from "@/lib/utils/api/actor";
import { needFailure } from "@/lib/utils/api/need";
import { BattleOperationError, type PipelineDeps, runGuardedBattleOperationCore } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";

export type BattleOperationCommand = { operation: string; battleId: string; input: unknown; expectedVersion: number; serverDice?: boolean };

/** Internal actor entry point; catalog/transport registration belongs to T14. */
export async function executeBattleOperation(
  actor: Actor,
  command: BattleOperationCommand,
  execution?: ActionExecutionContext,
  injectedDeps?: PipelineDeps,
): Promise<ActionResult> {
  const failure = needFailure(actor, { access: "member", scope: "battles:write" });

  if (failure) throw new BattleAccessError(403, failure);

  if (!Number.isInteger(command.expectedVersion) || command.expectedVersion < 0) throw new ContentError("Потрібна версія бою", 400);

  assertWriteScope(actor, execution);

  const input = command.input && typeof command.input === "object" ? command.input as Record<string, unknown> : {};

  if (["create", "patch", "delete", "clear-history", "audio"].includes(command.operation)) {
    return runGuardedBattleRecordOperation(actor, async () => {
      if (!["create", "clear-history"].includes(command.operation)) {
        const row = await battleRecord(actor.campaignId, command.battleId);

        if (row.version !== command.expectedVersion) throw new ContentError("Бій змінився; підготуйте новий перегляд", 409);
      }

      const data = await writeBattleRecord(actor.campaignId, actor.userId, command.operation as RecordOperation, command.battleId, input, execution);

      const battleId = command.operation === "create" && "id" in data ? data.id : command.battleId;

      return { data: { operation: command.operation, battleId, ...("version" in data ? { version: data.version } : {}) } as Prisma.JsonValue, affected: [{ domain: "battles", id: battleId || actor.campaignId, name: "Бій" }], warnings: [] };
    }, execution);
  }

  const params = { id: actor.campaignId, battleId: command.battleId, ...(typeof input.participantId === "string" && { participantId: input.participantId }) };

  let options = { ...await getBattleOperation(command.operation, params), params, operation: command.operation };

  if (command.serverDice) options = { ...options, ... withServerBattleDice(command.operation, options) };

  const base = injectedDeps ?? (execution ? scopedPipelineDeps(execution.db) : defaultPipelineDeps);

  const deps: PipelineDeps = execution ? {
    ...base,
    publish: messages => execution.afterCommit({ key: `${execution.intentId}:battle-publish`, kind: "publish", payload: JSON.parse(JSON.stringify({ battleMessages: messages })) as Prisma.JsonValue }),
    onLeftActive: (campaignId, battleId) => execution.afterCommit({ key: `${execution.intentId}:battle-left-active`, kind: "invalidate", payload: { campaignId, battleId, battleLeftActive: true } }),
  } : base;

  const run = async (): Promise<ActionResult> => {
    const outcome = await runGuardedBattleOperationCore(actor.userId, schemaDiceInput(command.operation, input, !!command.serverDice), command.expectedVersion, options, deps).catch((error: unknown) => {
      if (error instanceof BattleConflictError) throw Object.assign(new ContentError(error.message, 409), { code: "conflict", currentVersion: error.currentVersion });

      if (error instanceof BattleRuleError) throw Object.assign(new ContentError(error.message, 422), { code: error.code });

      if (error instanceof BattleOperationError) throw new ContentError(error.message, error.status);

      throw error;
    });

    return {
      data: { operation: command.operation, battleId: command.battleId, version: outcome.version },
      affected: [{ domain: "battles", id: command.battleId, name: "Бій" }],
      warnings: [],
    };
  };

  if (execution) return runContentWriteContext(actor.campaignId, execution.db, run);

  return deps.withWrite ? deps.withWrite(actor.campaignId, run) : run();
}
