import { createCampaignCrudApi } from "@/lib/api/client";
import type { Race, RaceFormData } from "@/types/races";

const racesApi = createCampaignCrudApi<Race, RaceFormData, Partial<RaceFormData>, Race>(
  "/races",
);

export const getRaces = racesApi.list;
export const createRace = racesApi.create;
export const updateRace = racesApi.update;
export const deleteRace = racesApi.remove;
