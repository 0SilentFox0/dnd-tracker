import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
  campaignRequest,
} from "@/lib/api/client";
import type { Unit, UnitGroup } from "@/types/units";

export async function getUnits(campaignId: string): Promise<Unit[]> {
  return campaignGet<Unit[]>(campaignId, "/units");
}

export async function getUnitGroups(
  campaignId: string,
): Promise<UnitGroup[]> {
  return campaignGet<UnitGroup[]>(campaignId, "/units/groups");
}

export async function createUnitGroup(
  campaignId: string,
  data: { name: string; damageModifier?: string | null },
): Promise<UnitGroup> {
  return campaignPost<UnitGroup>(campaignId, "/units/groups", data);
}

export async function getUnit(
  campaignId: string,
  unitId: string,
): Promise<Unit> {
  return campaignGet<Unit>(campaignId, `/units/${unitId}`);
}

export async function deleteAllUnits(
  campaignId: string,
): Promise<{ success: boolean; deleted: number }> {
  return campaignDelete<{ success: boolean; deleted: number }>(
    campaignId,
    "/units/delete-all",
  );
}

export async function deleteUnitsByLevel(
  campaignId: string,
  level: number,
): Promise<{ success: boolean; deleted: number }> {
  return campaignRequest<{ success: boolean; deleted: number }>(
    campaignId,
    "/units/delete-by-level",
    { method: "DELETE", body: { level } },
  );
}

export async function deleteUnit(
  campaignId: string,
  unitId: string,
): Promise<{ success: boolean }> {
  return campaignDelete<{ success: boolean }>(campaignId, `/units/${unitId}`);
}

export async function renameUnitGroup(
  campaignId: string,
  groupId: string,
  name: string,
  damageModifier?: string | null,
): Promise<UnitGroup> {
  return campaignPatch<UnitGroup>(
    campaignId,
    `/units/groups/${groupId}`,
    { name: name.trim(), damageModifier: damageModifier ?? null },
  );
}

export async function removeAllUnitsFromGroup(
  campaignId: string,
  groupId: string,
): Promise<{ success: boolean }> {
  return campaignPost<{ success: boolean }>(
    campaignId,
    `/units/groups/${groupId}/remove-all-units`,
    {},
  );
}

export async function updateUnit(
  campaignId: string,
  unitId: string,
  data: Partial<Unit>,
): Promise<Unit> {
  return campaignPatch<Unit>(campaignId, `/units/${unitId}`, data);
}

export async function importUnits(
  campaignId: string,
  body: { units: unknown[]; groupName?: string },
): Promise<{ imported: number }> {
  return campaignPost<{ imported: number }>(campaignId, "/units/import", body);
}
