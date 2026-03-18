import {
  campaignDelete,
  campaignGet,
  campaignPatch,
  campaignPost,
} from "@/lib/api/client";
import type { Race, RaceFormData } from "@/types/races";

export async function getRaces(campaignId: string): Promise<Race[]> {
  return campaignGet<Race[]>(campaignId, "/races");
}

export async function createRace(
  campaignId: string,
  data: RaceFormData,
): Promise<Race> {
  return campaignPost<Race>(campaignId, "/races", data);
}

export async function updateRace(
  campaignId: string,
  raceId: string,
  data: Partial<RaceFormData>,
): Promise<Race> {
  return campaignPatch<Race>(campaignId, `/races/${raceId}`, data);
}

export async function deleteRace(
  campaignId: string,
  raceId: string,
): Promise<Race> {
  return campaignDelete<Race>(campaignId, `/races/${raceId}`);
}
