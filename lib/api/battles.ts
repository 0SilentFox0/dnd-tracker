import type {
  AddParticipantData,
  BattleBalanceBody,
  BattleBalanceResponse,
  CreateBattleData,
} from "./battles-types";
import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
} from "./client";

import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";
import type {
  AttackData,
  BattleMutationResponse,
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
} from "./battles-types";

export type WithVersion<T> = T & { expectedVersion?: number };

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

export async function nextTurn(campaignId: string, battleId: string, body: WithVersion<object> = {}): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/next-turn`, body);
}

export async function attack(
  campaignId: string,
  battleId: string,
  data: WithVersion<AttackData & { endTurn?: boolean }>,
): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/attack`, data);
}

/** Attack and advance to next turn in one request (one fetch, one write). */
export async function bonusAction(campaignId: string, battleId: string, data: WithVersion<BonusActionData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/bonus-action`, data);
}

export async function moraleCheck(
  campaignId: string,
  battleId: string,
  data: WithVersion<MoraleCheckData>,
): Promise<BattleMutationResponse<{ moraleResult: MoraleCheckResult }>> {
  return campaignPost(campaignId, `/battles/${battleId}/morale-check`, data);
}

export async function castSpell(campaignId: string, battleId: string, data: WithVersion<SpellCastData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/spell`, data);
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

export async function startBattle(campaignId: string, battleId: string, body: WithVersion<object> = {}): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/start`, body);
}

export async function resetBattle(campaignId: string, battleId: string, body: WithVersion<object> = {}): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/reset`, body);
}

export async function completeBattle(
  campaignId: string,
  battleId: string,
  body: WithVersion<{ result?: "victory" | "defeat" }> = {},
): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/complete`, body);
}

export async function rollbackBattleAction(
  campaignId: string,
  battleId: string,
  body: WithVersion<{ actionIndex: number }>,
): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/rollback`, body);
}

export async function addBattleParticipant(
  campaignId: string,
  battleId: string,
  data: WithVersion<AddParticipantData>,
): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/add-participant`, data);
}

export async function updateBattleParticipant(
  campaignId: string,
  battleId: string,
  participantId: string,
  data: WithVersion<{ currentHp?: number; removeFromBattle?: boolean }>,
): Promise<BattleMutationResponse> {
  return campaignPatch<BattleMutationResponse>(campaignId, `/battles/${battleId}/participants/${participantId}`, data);
}
