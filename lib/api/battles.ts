import type {
  AttackData,
  BattleScene,
  MoraleCheckData,
  SpellCastData,
} from "@/types/api";

export async function getBattle(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}`,
  );

  if (!response.ok) throw new Error("Failed to fetch battle");

  return response.json();
}

export async function nextTurn(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/next-turn`,
    {
      method: "POST",
    },
  );

  if (!response.ok) throw new Error("Failed to advance turn");

  return response.json();
}

export async function attack(
  campaignId: string,
  battleId: string,
  data: AttackData,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/attack`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) throw new Error("Failed to process attack");

  return response.json();
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
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/morale-check`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) throw new Error("Failed to process morale check");

  return response.json();
}

export async function castSpell(
  campaignId: string,
  battleId: string,
  data: SpellCastData,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/spell`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) throw new Error("Failed to process spell");

  return response.json();
}

export async function updateBattle(
  campaignId: string,
  battleId: string,
  data: Partial<BattleScene>,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) throw new Error("Failed to update battle");

  return response.json();
}

export async function deleteBattle(
  campaignId: string,
  battleId: string,
): Promise<{ success: true }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) throw new Error("Failed to delete battle");

  return response.json();
}

export async function startBattle(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/start`,
    {
      method: "POST",
    },
  );

  if (!response.ok) throw new Error("Failed to start battle");

  return response.json();
}

export async function resetBattle(
  campaignId: string,
  battleId: string,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/reset`,
    {
      method: "POST",
    },
  );

  if (!response.ok) throw new Error("Failed to reset battle");

  return response.json();
}

export async function completeBattle(
  campaignId: string,
  battleId: string,
  data?: { result?: "victory" | "defeat" },
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data ?? {}),
    },
  );

  if (!response.ok) {
    const err = await response.json();

    throw new Error(err.error || "Failed to complete battle");
  }

  return response.json();
}

export async function rollbackBattleAction(
  campaignId: string,
  battleId: string,
  actionIndex: number,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/rollback`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actionIndex }),
    },
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to rollback action");
  }

  return response.json();
}

export type AddParticipantData = {
  sourceId: string;
  type: "character" | "unit";
  side: "ally" | "enemy";
  quantity?: number;
};

export async function addBattleParticipant(
  campaignId: string,
  battleId: string,
  data: AddParticipantData,
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/add-participant`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to add participant");
  }

  return response.json();
}

export async function updateBattleParticipant(
  campaignId: string,
  battleId: string,
  participantId: string,
  data: { currentHp?: number; removeFromBattle?: boolean },
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/participants/${participantId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Failed to update participant");
  }

  return response.json();
}
