import type { Unit, UnitGroup } from "@/types/units";

export async function getUnits(campaignId: string): Promise<Unit[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/units`);
  if (!response.ok) throw new Error("Failed to fetch units");
  return response.json();
}

export async function getUnitGroups(campaignId: string): Promise<UnitGroup[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/units/groups`);
  if (!response.ok) throw new Error("Failed to fetch unit groups");
  return response.json();
}

export async function createUnitGroup(
  campaignId: string,
  data: { name: string; damageModifier?: string | null }
): Promise<UnitGroup> {
  const response = await fetch(`/api/campaigns/${campaignId}/units/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create unit group");
  return response.json();
}

export async function getUnit(
  campaignId: string,
  unitId: string
): Promise<Unit> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/units/${unitId}`
  );
  if (!response.ok) throw new Error("Failed to fetch unit");
  return response.json();
}

export async function deleteAllUnits(
  campaignId: string
): Promise<{ success: boolean; deleted: number }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/units/delete-all`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) throw new Error("Failed to delete all units");
  return response.json();
}

export async function deleteUnitsByLevel(
  campaignId: string,
  level: number
): Promise<{ success: boolean; deleted: number }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/units/delete-by-level`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    }
  );
  if (!response.ok) throw new Error("Failed to delete units by level");
  return response.json();
}

export async function deleteUnit(
  campaignId: string,
  unitId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/units/${unitId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) throw new Error("Failed to delete unit");
  return response.json();
}

export async function renameUnitGroup(
  campaignId: string,
  groupId: string,
  name: string,
  damageModifier?: string | null
): Promise<UnitGroup> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/units/groups/${groupId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        damageModifier: damageModifier ?? null,
      }),
    }
  );
  if (!response.ok) throw new Error("Failed to rename group");
  return response.json();
}

export async function removeAllUnitsFromGroup(
  campaignId: string,
  groupId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/units/groups/${groupId}/remove-all-units`,
    {
      method: "POST",
    }
  );
  if (!response.ok) throw new Error("Failed to remove all units from group");
  return response.json();
}

export async function updateUnit(
  campaignId: string,
  unitId: string,
  data: Partial<Unit>
): Promise<Unit> {
  const response = await fetch(
    `/api/campaigns/${campaignId}/units/${unitId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to update unit");
  return response.json();
}
