"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("acquaintances");

  const invalidateKeys = [acquaintanceKeys.list(campaignId)];

  const create = useCrudMutation({ mutationFn: (data: CreateAcquaintanceData) => createAcquaintance(campaignId, data), invalidateKeys, errorText: t("notify.createFailed") });

  const update = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAcquaintanceData }) => updateAcquaintance(campaignId, id, data),
    invalidateKeys,
    errorText: t("notify.saveFailed"),
  });

  const remove = useCrudMutation({ mutationFn: (id: string) => deleteAcquaintance(campaignId, id), invalidateKeys, errorText: t("notify.removeFailed") });

  const addEntry = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateAcquaintanceEntryData }) => createAcquaintanceEntry(campaignId, id, data),
    invalidateKeys,
    errorText: t("notify.entryAddFailed"),
  });

  const updateEntry = useCrudMutation({
    mutationFn: ({ id, entryId, data }: { id: string; entryId: string; data: UpdateAcquaintanceEntryData }) => updateAcquaintanceEntry(campaignId, id, entryId, data),
    invalidateKeys,
    errorText: t("notify.entrySaveFailed"),
  });

  const removeEntry = useCrudMutation({
    mutationFn: ({ id, entryId }: { id: string; entryId: string }) => deleteAcquaintanceEntry(campaignId, id, entryId),
    invalidateKeys,
    errorText: t("notify.entryRemoveFailed"),
  });

  return { create, update, remove, addEntry, updateEntry, removeEntry };
}
