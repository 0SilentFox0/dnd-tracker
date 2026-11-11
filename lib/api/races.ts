import { campaignGet, campaignPut, createCampaignCrudApi } from "@/lib/api/client";
import type { SpeciesProfile } from "@/systems/wfrp/rules/creation";
import type { Race, RaceFormData, RaceProfileItem } from "@/types/races";

const racesApi = createCampaignCrudApi<Race, RaceFormData, Partial<RaceFormData>, { ok: true }>(
  "/races",
);

export const getRaces = racesApi.list;
export const createRace = racesApi.create;
export const updateRace = racesApi.update;
export const deleteRace = racesApi.remove;

export const getRaceProfiles = async (campaignId: string) => (await campaignGet<{ profiles: RaceProfileItem[] }>(campaignId, "/race-profiles")).profiles;

export const saveRaceProfile = (campaignId: string, raceId: string, profile: SpeciesProfile) => campaignPut<RaceProfileItem>(campaignId, `/races/${raceId}/profile`, profile);
