"use client";

import { useState } from "react";

import { useCreateRace, useDeleteRace, useRaces } from "./useRaces";

import { useConfirm } from "@/lib/hooks/common";
import type { RaceFormData } from "@/types/races";

export function useRacesList(campaignId: string) {
  const confirm = useConfirm();

  const { data: races = [], isLoading } = useRaces(campaignId);

  const create = useCreateRace(campaignId);

  const remove = useDeleteRace(campaignId);

  const [createOpen, setCreateOpen] = useState(false);

  const deleteRace = async (raceId: string) => {
    if (await confirm({ title: "Ви впевнені, що хочете видалити цю расу?", confirmLabel: "Видалити", destructive: true })) {
      remove.mutate(raceId);
    }
  };

  const createRace = (data: RaceFormData, onSuccess: () => void) =>
    create.mutate(data, {
      onSuccess: () => {
        onSuccess();
        setCreateOpen(false);
      },
    });

  const setOpen = (open: boolean) => {
    if (open) create.reset();

    setCreateOpen(open);
  };

  return {
    races,
    isLoading,
    createDialog: { open: createOpen, setOpen, status: { isPending: create.isPending, error: create.error } },
    actions: { createRace, deleteRace },
  };
}
