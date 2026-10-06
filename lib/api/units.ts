import { campaignDelete, campaignGet, campaignPatch, campaignPost } from "@/lib/api/client";
import type { ImportUnit, UnitImportResult } from "@/types/import";
import type { Unit } from "@/types/units";

export async function getUnits(campaignId: string): Promise<Unit[]> {
  return campaignGet<Unit[]>(campaignId, "/units");
}

export async function getUnit(campaignId: string, unitId: string): Promise<Unit> {
  return campaignGet<Unit>(campaignId, `/units/${unitId}`);
}

export async function createUnit(campaignId: string, data: Partial<Unit>): Promise<Unit> {
  return campaignPost<Unit>(campaignId, "/units", data);
}

export async function updateUnit(campaignId: string, unitId: string, data: Partial<Unit>): Promise<Unit> {
  return campaignPatch<Unit>(campaignId, `/units/${unitId}`, data);
}

export async function deleteUnit(campaignId: string, unitId: string): Promise<{ success: boolean }> {
  return campaignDelete<{ success: boolean }>(campaignId, `/units/${unitId}`);
}

export async function deleteAllUnits(campaignId: string): Promise<{ success: boolean; deleted: number }> {
  return campaignDelete<{ success: boolean; deleted: number }>(campaignId, "/units/delete-all");
}

export async function importUnits(campaignId: string, body: { units: ImportUnit[] }): Promise<UnitImportResult> {
  return campaignPost<UnitImportResult>(campaignId, "/units/import", body);
}
