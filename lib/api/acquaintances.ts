import { campaignDelete, campaignGet, campaignPatch, campaignPost, campaignPut } from "./client";

import type {
  AcquaintanceEntryView,
  AcquaintanceNoteView,
  AcquaintancesResponse,
  AcquaintanceView,
  CreateAcquaintanceData,
  CreateAcquaintanceEntryData,
  SaveAcquaintanceNoteData,
  UpdateAcquaintanceData,
  UpdateAcquaintanceEntryData,
} from "@/types/acquaintances";

const base = "/acquaintances";

export const getAcquaintances = (campaignId: string) => campaignGet<AcquaintancesResponse>(campaignId, base);

export const createAcquaintance = (campaignId: string, data: CreateAcquaintanceData) => campaignPost<AcquaintanceView>(campaignId, base, data);

export const updateAcquaintance = (campaignId: string, id: string, data: UpdateAcquaintanceData) => campaignPatch<AcquaintanceView>(campaignId, `${base}/${id}`, data);

export const deleteAcquaintance = (campaignId: string, id: string) => campaignDelete<{ success: true }>(campaignId, `${base}/${id}`);

export const createAcquaintanceEntry = (campaignId: string, id: string, data: CreateAcquaintanceEntryData) => campaignPost<AcquaintanceEntryView>(campaignId, `${base}/${id}/entries`, data);

export const updateAcquaintanceEntry = (campaignId: string, id: string, entryId: string, data: UpdateAcquaintanceEntryData) =>
  campaignPatch<AcquaintanceEntryView>(campaignId, `${base}/${id}/entries/${entryId}`, data);

export const deleteAcquaintanceEntry = (campaignId: string, id: string, entryId: string) => campaignDelete<{ success: true }>(campaignId, `${base}/${id}/entries/${entryId}`);

export const saveAcquaintanceNote = (campaignId: string, id: string, data: SaveAcquaintanceNoteData) =>
  campaignPut<AcquaintanceNoteView | { deleted: true }>(campaignId, `${base}/${id}/note`, data);
