import { campaignDelete, createCampaignCrudApi } from "@/lib/api/client";
import type { Unit } from "@/types/units";

const unitsApi = createCampaignCrudApi<Unit, Partial<Unit>, Partial<Unit>, { ok: true }>("/units");

export const getUnits = unitsApi.list;
export const getUnit = unitsApi.get;
export const createUnit = unitsApi.create;
export const updateUnit = unitsApi.update;
export const deleteUnit = unitsApi.remove;

export async function deleteAllUnits(campaignId: string): Promise<{ ok: true; deleted: number }> {
  return campaignDelete<{ ok: true; deleted: number }>(campaignId, "/units");
}
