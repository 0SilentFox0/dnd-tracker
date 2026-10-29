"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useConfirm } from "./useConfirm";
import { useNotify } from "./useNotify";

import { errorMessage } from "@/lib/utils/common/error-message";

interface LibraryListTexts {
  confirmDelete: string;
  deleteError: string;
  createError: string;
}

interface LibraryMutation<TVars> {
  mutate: (vars: TVars, options: { onSuccess?: () => void; onError?: (error: Error) => void }) => void;
}

interface UseLibraryListArgs<T, TCreate> {
  query: { data: T[] | undefined; isLoading: boolean };
  create: LibraryMutation<TCreate>;
  remove: LibraryMutation<string>;
  texts: LibraryListTexts;
}

const NO_ITEMS: never[] = [];

export function useLibraryList<T, TCreate>({ query, create, remove, texts }: UseLibraryListArgs<T, TCreate>) {
  const t = useTranslations("common");

  const confirm = useConfirm();

  const notify = useNotify();

  const [createOpen, setCreateOpen] = useState(false);

  return {
    items: query.data ?? (NO_ITEMS as T[]),
    isLoading: query.isLoading,
    createDialog: { open: createOpen, setOpen: setCreateOpen },
    create: (data: TCreate) =>
      create.mutate(data, { onSuccess: () => setCreateOpen(false), onError: (error) => void notify(errorMessage(error, texts.createError)) }),
    remove: async (id: string) => {
      if (!(await confirm({ title: texts.confirmDelete, confirmLabel: t("actions.delete"), destructive: true }))) return;

      remove.mutate(id, { onError: (error) => void notify(errorMessage(error, texts.deleteError)) });
    },
  };
}
