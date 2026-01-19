import { BattleParticipant, BattlePreparationParticipant, BattleAction } from "@/lib/types/battle";

export interface BattleScene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  status: "prepared" | "active" | "completed";
  participants: BattlePreparationParticipant[];
  currentRound: number;
  currentTurnIndex: number;
  initiativeOrder: BattleParticipant[];
  battleLog: BattleAction[]; // Розширено для зберігання повних BattleAction замість простих записів
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AttackData {
  attackerId: string;
  attackerType: "character" | "unit";
  targetId: string;
  targetType: "character" | "unit";
  attackRoll: number;
  damageRolls: number[];
}

export async function getBattle(
  campaignId: string,
  battleId: string
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}`
  );
  if (!response.ok) throw new Error("Failed to fetch battle");
  return response.json();
}

export async function nextTurn(
  campaignId: string,
  battleId: string
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/next-turn`,
    {
      method: "POST",
    }
  );
  if (!response.ok) throw new Error("Failed to advance turn");
  return response.json();
}

export async function attack(
  campaignId: string,
  battleId: string,
  data: AttackData
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/attack`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to process attack");
  return response.json();
}
