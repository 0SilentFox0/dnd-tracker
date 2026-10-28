"use client";

import { acquaintanceKeys } from "./keys";

import {
  createAcquaintance,
  createAcquaintanceEntry,
  deleteAcquaintance,
  deleteAcquaintanceEntry,
  updateAcquaintance,
  updateAcquaintanceEntry,
} from "@/lib/api/acquaintances";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CreateAcquaintanceData, CreateAcquaintanceEntryData, UpdateAcquaintanceData, UpdateAcquaintanceEntryData } from "@/types/acquaintances";

export function useAcquaintanceActions(campaignId: string) {
  const invalidateKeys = [acquaintanceKeys.list(campaignId)];

  const create = useCrudMutation({ mutationFn: (data: CreateAcquaintanceData) => createAcquaintance(campaignId, data), invalidateKeys, errorText: "Не вдалося створити знайомство" });

  const update = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAcquaintanceData }) => updateAcquaintance(campaignId, id, data),
    invalidateKeys,
    errorText: "Не вдалося зберегти знайомство",
  });

  const remove = useCrudMutation({ mutationFn: (id: string) => deleteAcquaintance(campaignId, id), invalidateKeys, errorText: "Не вдалося видалити знайомство" });

  const addEntry = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateAcquaintanceEntryData }) => createAcquaintanceEntry(campaignId, id, data),
    invalidateKeys,
    errorText: "Не вдалося додати запис",
  });

  const updateEntry = useCrudMutation({
    mutationFn: ({ id, entryId, data }: { id: string; entryId: string; data: UpdateAcquaintanceEntryData }) => updateAcquaintanceEntry(campaignId, id, entryId, data),
    invalidateKeys,
    errorText: "Не вдалося зберегти запис",
  });

  const removeEntry = useCrudMutation({
    mutationFn: ({ id, entryId }: { id: string; entryId: string }) => deleteAcquaintanceEntry(campaignId, id, entryId),
    invalidateKeys,
    errorText: "Не вдалося видалити запис",
  });

  return { create, update, remove, addEntry, updateEntry, removeEntry };
}
