"use client";

import { useTranslations } from "next-intl";

import { useBackgrounds, useCreateBackground, useDeleteBackground } from "./useBackgrounds";

import { useLibraryList } from "@/lib/hooks/common";

export function useBackgroundsList(campaignId: string) {
  const t = useTranslations("backgrounds");

  return useLibraryList({
    query: useBackgrounds(campaignId),
    create: useCreateBackground(campaignId),
    remove: useDeleteBackground(campaignId),
    texts: { confirmDelete: t("list.confirmDelete"), deleteError: t("list.deleteError"), createError: t("list.createError") },
  });
}
