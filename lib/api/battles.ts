import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
} from "./client";

import type { AbilityKey } from "@/lib/constants/abilities";
import { BATTLE_LOG_PAGE_SIZE, BATTLE_VERSION_ONLY_PARAM } from "@/lib/constants/battle";
import type { Condition5eKey } from "@/lib/utils/abilities/schema/kinds";
import type { MoraleCheckResult } from "@/lib/utils/battle/morale/check";
import type {
  AbilityActionData,
  AttackData,
  AuraZoneData,
  BattleEventsPage,
  BattleMutationResponse,
  BattleScene,
  BattleSummary,
  BattleVersion,
  BonusActionData,
  MapTerrainData,
  MapTerrainResponse,
  MapWeatherData,
  MazeActionData,
  MazeMarkData,
  MoraleCheckData,
  MoveParticipantData,
  SpellCastData,
} from "@/types/api";
import type { BattleBrief, LegendaryOption } from "@/types/battle";
import type {
  AddParticipantData,
  BattleBalanceBody,
  BattleBalanceResponse,
  CreateBattleData,
} from "@/types/battle-setup";

export type {
  AddParticipantData,
  BattleBalanceBody,
  BattleBalanceResponse,
  CreateBattleData,
} from "@/types/battle-setup";

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

export async function abilityAction(campaignId: string, battleId: string, data: WithVersion<AbilityActionData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/ability-action`, data);
}

export async function setAuraZone(campaignId: string, battleId: string, data: WithVersion<AuraZoneData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/aura-zone`, data);
}

export async function moveParticipant(campaignId: string, battleId: string, data: WithVersion<MoveParticipantData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/move`, data);
}

export async function setMapTerrain(
  campaignId: string,
  battleId: string,
  data: WithVersion<MapTerrainData>,
): Promise<BattleMutationResponse<MapTerrainResponse>> {
  return campaignPost<BattleMutationResponse<MapTerrainResponse>>(campaignId, `/battles/${battleId}/map-terrain`, data);
}

export async function mazeAction(campaignId: string, battleId: string, data: WithVersion<MazeActionData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/maze`, data);
}

export async function mazeMark(campaignId: string, battleId: string, data: WithVersion<MazeMarkData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/maze-mark`, data);
}

export async function setMapWeather(
  campaignId: string,
  battleId: string,
  data: WithVersion<MapWeatherData>,
): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/map-weather`, data);
}

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

export async function revealBattleParticipants(campaignId: string, battleId: string, data: WithVersion<{ participantIds: string[] }>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/reveal-participant`, data);
}

export type BattleConditionsBody =
  | { action: "apply"; participantId: string; condition: Condition5eKey; rounds?: number; levels?: number; saveEnds?: { ability: AbilityKey; dc: number } }
  | { action: "remove"; participantId: string; condition: Condition5eKey };

export async function applyBattleCondition(campaignId: string, battleId: string, data: WithVersion<BattleConditionsBody>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/conditions`, data);
}

export type CoreActionBody =
  | { action: "dash" | "disengage" | "dodge" | "hide" | "ready" | "standUp" | "escape"; participantId: string }
  | { action: "help" | "grapple" | "readiedAttack"; participantId: string; targetId: string }
  | { action: "shove"; participantId: string; targetId: string; mode: "prone" | "push" }
  | { action: "legendary"; participantId: string; option: LegendaryOption };

export async function runCoreAction(campaignId: string, battleId: string, data: WithVersion<CoreActionBody>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/core-action`, data);
}

export async function scaleBattleUnits(campaignId: string, battleId: string, data: WithVersion<{ direction: "buff" | "debuff" }>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/scale-units`, data);
}

export type UnitControlData = { mode: "assign"; participantId: string; controlledBy: string } | { mode: "random" };

export async function setBattleUnitControl(campaignId: string, battleId: string, data: WithVersion<UnitControlData>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/unit-control`, data);
}

export async function refreshBattleSources(campaignId: string, battleId: string, data: WithVersion<Record<string, never>>): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/refresh-sources`, data);
}

export async function updateBattleParticipant(
  campaignId: string,
  battleId: string,
  participantId: string,
  data: WithVersion<{ lairActive?: boolean; currentHp?: number; removeFromBattle?: boolean; kill?: boolean; revive?: boolean }>,
): Promise<BattleMutationResponse> {
  return campaignPatch<BattleMutationResponse>(campaignId, `/battles/${battleId}/participants/${participantId}`, data);
}

export const getBattleBriefs = (campaignId: string) => campaignGet<BattleBrief[]>(campaignId, "/battles?brief=1", { cache: "no-store" });
