"use client";

import { useMemo, useState } from "react";

import { useCreateFeat, useDeleteFeat, useFeats } from "./useFeats";

import { useConfirm, useNotify } from "@/lib/hooks/common";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { FeatData, FeatFormData, FeatType } from "@/types/choices";

const NO_FEATS: FeatData[] = [];

export function useFeatsList(campaignId: string) {
  const confirm = useConfirm();

  const notify = useNotify();

  const { data: all = NO_FEATS, isLoading } = useFeats(campaignId);

  const create = useCreateFeat(campaignId);

  const remove = useDeleteFeat(campaignId);

  const [createOpen, setCreateOpen] = useState(false);

  const [type, setType] = useState<FeatType | null>(null);

  const feats = useMemo(() => (type ? all.filter((f) => f.type === type) : all), [all, type]);

  const deleteFeat = async (featId: string) => {
    if (!(await confirm({ title: "Видалити цю рису?", confirmLabel: "Видалити", destructive: true }))) return;

    remove.mutate(featId, { onError: (error) => void notify(errorMessage(error, "Не вдалося видалити рису")) });
  };

  const createFeat = (data: FeatFormData) =>
    create.mutate(data, { onSuccess: () => setCreateOpen(false), onError: (error) => void notify(errorMessage(error, "Не вдалося створити рису")) });

  return { feats, all, isLoading, typeFilter: { value: type, set: setType }, createDialog: { open: createOpen, setOpen: setCreateOpen }, actions: { createFeat, deleteFeat } };
}
