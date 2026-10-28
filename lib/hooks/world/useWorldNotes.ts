"use client";

import { useQueryClient } from "@tanstack/react-query";

import { worldKeys } from "./keys";

import { createWorldNote, deleteWorldNote, updateWorldNote } from "@/lib/api/world";
import { useCrudMutation } from "@/lib/hooks/common";
import type { CreateWorldNoteData, WorldNote, WorldView } from "@/types/world";

type Snapshot = [readonly unknown[], WorldView | undefined][];

export function useWorldNotes(campaignId: string, mapId: string | null) {
  const queryClient = useQueryClient();

  const viewFilter = { queryKey: worldKeys.viewAll(campaignId) };

  const invalidateKeys = () => [worldKeys.viewAll(campaignId), ...(mapId ? [worldKeys.map(campaignId, mapId)] : [])];

  const patchNotes = (fn: (notes: WorldNote[]) => WorldNote[]) => queryClient.setQueriesData<WorldView>(viewFilter, (v) => (v ? { ...v, notes: fn(v.notes) } : v));

  const snapshot = async (): Promise<Snapshot> => {
    await queryClient.cancelQueries(viewFilter);

    return queryClient.getQueriesData<WorldView>(viewFilter);
  };

  const restore = (_e: unknown, _v: unknown, prev: Snapshot | undefined) => prev?.forEach(([key, data]) => queryClient.setQueryData(key, data));

  const create = useCrudMutation({
    mutationFn: (data: CreateWorldNoteData) => createWorldNote(campaignId, data),
    invalidateKeys,
    errorText: "Не вдалося зберегти нотатку",
  });

  const update = useCrudMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<WorldNote, "text" | "visibility">> }) => updateWorldNote(campaignId, id, data),
    onMutate: async ({ id, data }) => {
      const prev = await snapshot();

      patchNotes((notes) => notes.map((n) => (n.id === id ? { ...n, ...data } : n)));

      return prev;
    },
    onError: restore,
    invalidateKeys,
    errorText: "Не вдалося зберегти нотатку",
  });

  const remove = useCrudMutation({
    mutationFn: (id: string) => deleteWorldNote(campaignId, id),
    onMutate: async (id) => {
      const prev = await snapshot();

      patchNotes((notes) => notes.filter((n) => n.id !== id));

      return prev;
    },
    onError: restore,
    invalidateKeys,
    errorText: "Не вдалося видалити нотатку",
  });

  return { create, update, remove };
}
