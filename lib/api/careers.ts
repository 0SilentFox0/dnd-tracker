import { createCampaignCrudApi } from "@/lib/api/client";
import type { CareerData, CareerFormData } from "@/types/careers";

const careersApi = createCampaignCrudApi<CareerData, CareerFormData, Partial<CareerFormData>, { ok: true }>("/careers");

export const getCareers = careersApi.list;
export const getCareer = careersApi.get;
export const createCareer = careersApi.create;
export const updateCareer = careersApi.update;
export const deleteCareer = careersApi.remove;
