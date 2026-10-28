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

  const createRace = (data: RaceFormData) => create.mutate(data, { onSuccess: () => setCreateOpen(false) });

  return {
    races,
    isLoading,
    createDialog: { open: createOpen, setOpen: setCreateOpen },
    actions: { createRace, deleteRace },
  };
}
