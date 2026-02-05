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
