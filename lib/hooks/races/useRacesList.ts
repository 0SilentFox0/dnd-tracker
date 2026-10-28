"use client";

import { useState } from "react";

import { useCreateRace, useDeleteRace, useRaces } from "./useRaces";

import { useConfirm, useSearch } from "@/lib/hooks/common";
import type { Race, RaceFormData } from "@/types/races";

const raceFields = (race: Race) => [race.name];

export function useRacesList(campaignId: string) {
  const confirm = useConfirm();

  const { data: allRaces = [], isLoading } = useRaces(campaignId);

  const search = useSearch(allRaces, raceFields);

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
    races: search.items,
    total: allRaces.length,
    isLoading,
    search,
    createDialog: { open: createOpen, setOpen, status: { isPending: create.isPending, error: create.error } },
    actions: { createRace, deleteRace },
  };
}
