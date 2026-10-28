import { createCampaignCrudApi } from "@/lib/api/client";
import type { BackgroundData, BackgroundFormData } from "@/types/backgrounds";

const backgroundsApi = createCampaignCrudApi<BackgroundData, BackgroundFormData, Partial<BackgroundFormData>, { ok: true }>("/backgrounds");

export const getBackgrounds = backgroundsApi.list;
export const getBackground = backgroundsApi.get;
export const createBackground = backgroundsApi.create;
export const updateBackground = backgroundsApi.update;
export const deleteBackground = backgroundsApi.remove;
