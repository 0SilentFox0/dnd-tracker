"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useCreateFeat, useDeleteFeat, useFeats } from "./useFeats";

import { useLibraryList } from "@/lib/hooks/common";
import type { FeatFormData, FeatType } from "@/types/choices";

export function useFeatsList(campaignId: string) {
  const t = useTranslations("feats");

  const list = useLibraryList({
    query: useFeats(campaignId),
    create: useCreateFeat(campaignId),
    remove: useDeleteFeat(campaignId),
    texts: { confirmDelete: t("list.confirmDelete"), deleteError: t("list.deleteError"), createError: t("list.createError") },
  });

  const all = list.items;

  const [type, setType] = useState<FeatType | null>(null);

  const feats = useMemo(() => (type ? all.filter((f) => f.type === type) : all), [all, type]);

  return {
    feats,
    all,
    isLoading: list.isLoading,
    typeFilter: { value: type, set: setType },
    createDialog: list.createDialog,
    actions: { createFeat: (data: FeatFormData) => list.create(data), deleteFeat: list.remove },
  };
}
