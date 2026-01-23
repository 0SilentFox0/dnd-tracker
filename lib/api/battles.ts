import type { AttackData, BattleScene, MoraleCheckData, SpellCastData } from "@/types/api";

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


export async function moraleCheck(
  campaignId: string,
  battleId: string,
  data: MoraleCheckData
): Promise<{ battle: BattleScene; moraleResult: { shouldSkipTurn: boolean; hasExtraTurn: boolean; message: string } }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/morale-check`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) throw new Error("Failed to process morale check");

  return response.json();
}


export async function castSpell(
  campaignId: string,
  battleId: string,
  data: SpellCastData
): Promise<BattleScene> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/battles/${battleId}/spell`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) throw new Error("Failed to process spell");

  return response.json();
}
