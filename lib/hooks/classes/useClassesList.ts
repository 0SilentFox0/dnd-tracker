"use client";

import { useState } from "react";

import { useClasses, useCreateClass, useDeleteClass } from "./useClasses";

import { ApiError } from "@/lib/api/client";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { ClassFormData } from "@/types/classes";

export function useClassesList(campaignId: string) {
  const confirm = useConfirm();

  const notify = useNotify();

  const { data: classes = [], isLoading } = useClasses(campaignId);

  const create = useCreateClass(campaignId);

  const remove = useDeleteClass(campaignId);

  const [createOpen, setCreateOpen] = useState(false);

  const deleteClass = async (classId: string) => {
    if (!(await confirm({ title: "Ви впевнені, що хочете видалити цей клас?", confirmLabel: "Видалити", destructive: true }))) return;

    remove.mutate(classId, {
      onError: (error) => void notify(error instanceof ApiError ? error.message : "Не вдалося видалити клас"),
    });
  };

  const createClass = (data: ClassFormData) =>
    create.mutate(data, {
      onSuccess: () => setCreateOpen(false),
      onError: (error) => void notify(error instanceof ApiError ? error.message : "Не вдалося створити клас"),
    });

  return {
    classes,
    isLoading,
    createDialog: { open: createOpen, setOpen: setCreateOpen },
    actions: { createClass, deleteClass },
  };
}
