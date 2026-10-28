import { createCampaignCrudApi } from "@/lib/api/client";
import type { FeatData, FeatFormData } from "@/types/choices";

const featsApi = createCampaignCrudApi<FeatData, FeatFormData, Partial<FeatFormData>, { ok: true }>("/feats");

export const getFeats = featsApi.list;
export const getFeat = featsApi.get;
export const createFeat = featsApi.create;
export const updateFeat = featsApi.update;
export const deleteFeat = featsApi.remove;
