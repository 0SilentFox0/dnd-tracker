"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useDeleteBattle } from "./useBattles";

import { useConfirm, useNotify } from "@/lib/hooks/common";

export function useDeleteBattleCard(campaignId: string, battleId: string) {
  const t = useTranslations("battleSetup");

  const tActions = useTranslations("common.actions");

  const notify = useNotify();

  const confirm = useConfirm();

  const router = useRouter();

  const remove = useDeleteBattle(campaignId);

  const onDelete = useCallback(async () => {
    if (!(await confirm({ title: t("form.confirmDelete"), confirmLabel: tActions("delete"), destructive: true }))) return;

    remove.mutate(battleId, {
      onSuccess: () => router.refresh(),
      onError: () => void notify(t("form.notify.deleteFailed")),
    });
  }, [battleId, confirm, remove, router, notify, t, tActions]);

  return { isDeleting: remove.isPending, onDelete };
}
