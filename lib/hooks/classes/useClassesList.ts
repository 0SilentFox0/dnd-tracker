"use client";

import { useClasses, useCreateClass, useDeleteClass } from "./useClasses";

import { useLibraryList } from "@/lib/hooks/common";
import type { ClassFormData } from "@/types/classes";

export function useClassesList(campaignId: string) {
  const list = useLibraryList({
    query: useClasses(campaignId),
    create: useCreateClass(campaignId),
    remove: useDeleteClass(campaignId),
    texts: { confirmDelete: "Ви впевнені, що хочете видалити цей клас?", deleteError: "Не вдалося видалити клас", createError: "Не вдалося створити клас" },
  });

  return {
    classes: list.items,
    isLoading: list.isLoading,
    createDialog: list.createDialog,
    actions: { createClass: (data: ClassFormData) => list.create(data), deleteClass: list.remove },
  };
}
