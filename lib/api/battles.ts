import type {
  AddParticipantData,
  BattleBalanceBody,
  BattleBalanceResponse,
  CreateBattleData,
  DamageBreakdownRequestBody,
  DamageBreakdownResponse,
  SpellPreviewResponse,
} from "./battles-types";
import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
} from "./client";

import type {
  AttackData,
  BattleScene,
  BonusActionData,
  MoraleCheckData,
  SpellCastData,
} from "@/types/api";

export type {
  AddParticipantData,
  BattleBalanceBody,
  BattleBalanceResponse,
  CreateBattleData,
  DamageBreakdownRequestBody,
  DamageBreakdownResponse,
  DamageBreakdownTargetResult,
  SpellPreviewResponse,
} from "./battles-types";

export async function getDamageBreakdown(
  campaignId: string,
  battleId: string,
  body: DamageBreakdownRequestBody,
): Promise<DamageBreakdownResponse> {
  const isMultiTarget =
    Array.isArray(body.targetIds) && body.targetIds.length > 1;

  return campaignPost<DamageBreakdownResponse>(
    campaignId,
    `/battles/${battleId}/damage-breakdown`,
    {
      attackerId: body.attackerId,
      ...(isMultiTarget
        ? { targetIds: body.targetIds }
        : { targetId: body.targetIds?.[0] ?? body.targetId }),
      attackId: body.attackId,
      damageRolls: body.damageRolls,
      isCritical: body.isCritical,
    },
  );
}

export async function getBattles(
  campaignId: string,
): Promise<BattleScene[]> {
  return campaignGet<BattleScene[]>(campaignId, "/battles");
}

export async function deleteAllBattles(
  campaignId: string,
): Promise<{ success: boolean; deletedCount: number }> {
  return campaignDelete<{ success: boolean; deletedCount: number }>(
    campaignId,
    "/battles",
  );
}

export async function createBattle(
  campaignId: string,
  data: CreateBattleData,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(campaignId, "/battles", data);
}

export async function getBattleBalance(
  campaignId: string,
  body: BattleBalanceBody,
): Promise<BattleBalanceResponse> {
  return campaignPost<BattleBalanceResponse>(
    campaignId,
    "/battles/balance",
    body,
  );
}

export async function getBattle(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  return campaignGet<BattleScene>(campaignId, `/battles/${battleId}`, {
    cache: "no-store",
  });
}

export async function nextTurn(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/next-turn`,
    {},
  );
}

export async function attack(
  campaignId: string,
  battleId: string,
  data: AttackData,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/attack`,
    data,
  );
}

/** Attack and advance to next turn in one request (one fetch, one write). */
export async function attackAndNextTurn(
  campaignId: string,
  battleId: string,
  data: AttackData,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/attack-and-next-turn`,
    data,
  );
}

export async function bonusAction(
  campaignId: string,
  battleId: string,
  data: BonusActionData,
): Promise<BattleScene> {
  const result = await campaignPost<{ battle: BattleScene }>(
    campaignId,
    `/battles/${battleId}/bonus-action`,
    data,
  );

  return result.battle;
}

export async function moraleCheck(
  campaignId: string,
  battleId: string,
  data: MoraleCheckData,
): Promise<{
  battle: BattleScene;
  moraleResult: {
    shouldSkipTurn: boolean;
    hasExtraTurn: boolean;
    message: string;
  };
}> {
  return campaignPost(campaignId, `/battles/${battleId}/morale-check`, data);
}

export async function castSpell(
  campaignId: string,
  battleId: string,
  data: SpellCastData,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/spell`,
    data,
  );
}

export async function spellPreview(
  campaignId: string,
  battleId: string,
  data: SpellCastData & { preview?: boolean },
): Promise<SpellPreviewResponse> {
  return campaignPost<SpellPreviewResponse>(
    campaignId,
    `/battles/${battleId}/spell`,
    { ...data, preview: true },
  );
}

export async function updateBattle(
  campaignId: string,
  battleId: string,
  data: Partial<BattleScene>,
): Promise<BattleScene> {
  return campaignPatch<BattleScene>(
    campaignId,
    `/battles/${battleId}`,
    data,
  );
}

export async function deleteBattle(
  campaignId: string,
  battleId: string,
): Promise<{ success: true }> {
  return campaignDelete<{ success: true }>(
    campaignId,
    `/battles/${battleId}`,
  );
}

export async function startBattle(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/start`,
    {},
  );
}

export async function resetBattle(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/reset`,
    {},
  );
}

export async function completeBattle(
  campaignId: string,
  battleId: string,
  data?: { result?: "victory" | "defeat" },
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/complete`,
    data ?? {},
  );
}

export async function rollbackBattleAction(
  campaignId: string,
  battleId: string,
  actionIndex: number,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/rollback`,
    { actionIndex },
  );
}

export async function addBattleParticipant(
  campaignId: string,
  battleId: string,
  data: AddParticipantData,
): Promise<BattleScene> {
  return campaignPost<BattleScene>(
    campaignId,
    `/battles/${battleId}/add-participant`,
    data,
  );
}

export async function updateBattleParticipant(
  campaignId: string,
  battleId: string,
  participantId: string,
  data: { currentHp?: number; removeFromBattle?: boolean },
): Promise<BattleScene> {
  return campaignPatch<BattleScene>(
    campaignId,
    `/battles/${battleId}/participants/${participantId}`,
    data,
  );
}
