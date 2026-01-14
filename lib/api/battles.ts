export interface InitiativeParticipant {
  participantId: string;
  participantType: "character" | "unit";
  instanceId?: string;
  initiative: number;
  name: string;
  avatar?: string;
  side: "ally" | "enemy";
  currentHp: number;
  maxHp: number;
  tempHp: number;
  status: "active" | "dead" | "unconscious";
  activeEffects: Array<{
    name: string;
    type: "buff" | "debuff" | "condition";
    duration: number;
    effect: object;
    description?: string;
  }>;
}

export interface BattleScene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  status: "prepared" | "active" | "completed";
  participants: Array<{
    id: string;
    type: "character" | "unit";
    side: "ally" | "enemy";
    quantity?: number;
  }>;
  currentRound: number;
  currentTurnIndex: number;
  initiativeOrder: InitiativeParticipant[];
  battleLog: Array<{
    round: number;
    timestamp: string;
    actorName: string;
    action: string;
    target?: string;
    result: string;
    damage?: number;
    healing?: number;
  }>;
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
