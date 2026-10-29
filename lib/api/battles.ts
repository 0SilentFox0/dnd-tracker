import { battleOps, callBattleOp, type WithVersion } from "./battle-ops";
import { campaignDelete, campaignGet, campaignPatch,campaignPost } from "./client";

import { BATTLE_LOG_PAGE_SIZE, BATTLE_VERSION_ONLY_PARAM } from "@/lib/constants/battle";
import type { BattleEventsPage, BattleScene, BattleSummary, BattleVersion } from "@/types/api";
import type { BattleBrief } from "@/types/battle";
import type { BattleBalanceBody, BattleBalanceResponse, CreateBattleData } from "@/types/battle-setup";

export type { BattleConditionsBody, CoreActionBody, UnitControlData, WithVersion } from "./battle-ops";
export type { AddParticipantData, BattleBalanceBody, BattleBalanceResponse, CreateBattleData } from "@/types/battle-setup";

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

export async function getBattleBalanceStats(campaignId: string): Promise<BattleBalanceResponse> {
  return campaignGet<BattleBalanceResponse>(campaignId, "/battles/balance");
}

export async function getBattle(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  return campaignGet<BattleScene>(campaignId, `/battles/${battleId}`, {
    cache: "no-store",
  });
}

export async function getBattleVersion(campaignId: string, battleId: string): Promise<BattleVersion> {
  return campaignGet<BattleVersion>(campaignId, `/battles/${battleId}?${BATTLE_VERSION_ONLY_PARAM}=1`, { cache: "no-store" });
}

export async function getBattleEvents(
  campaignId: string,
  battleId: string,
  page: { before: number; limit?: number },
): Promise<BattleEventsPage> {
  const query = new URLSearchParams({ before: String(page.before), limit: String(page.limit ?? BATTLE_LOG_PAGE_SIZE) });

  return campaignGet<BattleEventsPage>(campaignId, `/battles/${battleId}/events?${query}`, { cache: "no-store" });
}

export async function getBattleSummary(campaignId: string, battleId: string): Promise<BattleSummary> {
  return campaignGet<BattleSummary>(campaignId, `/battles/${battleId}/summary`, { cache: "no-store" });
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

export const startBattle = (campaignId: string, battleId: string, body: WithVersion<object> = {}) => callBattleOp(battleOps.start, campaignId, battleId, body);

export const getBattleBriefs = (campaignId: string) => campaignGet<BattleBrief[]>(campaignId, "/battles?brief=1", { cache: "no-store" });
