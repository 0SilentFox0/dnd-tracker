"use client";

import { useBackgrounds, useCreateBackground, useDeleteBackground } from "./useBackgrounds";

import { useLibraryList } from "@/lib/hooks/common";

export function useBackgroundsList(campaignId: string) {
  return useLibraryList({
    query: useBackgrounds(campaignId),
    create: useCreateBackground(campaignId),
    remove: useDeleteBackground(campaignId),
    texts: { confirmDelete: "Видалити передісторію?", deleteError: "Не вдалося зберегти передісторію", createError: "Не вдалося зберегти передісторію" },
  });
}
