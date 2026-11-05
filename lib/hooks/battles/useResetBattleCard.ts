"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useResetBattle } from "./useBattles";

import { useConfirm, useNotify } from "@/lib/hooks/common";

export function useResetBattleCard(campaignId: string, battleId: string, mode: "stop" | "replay") {
  const t = useTranslations("battleSetup.list.reset");

  const confirm = useConfirm();

  const notify = useNotify();

  const router = useRouter();

  const reset = useResetBattle(campaignId, battleId, { onFailure: (message) => void notify(message) });

  const onReset = useCallback(async () => {
    if (!(await confirm({ title: t(`${mode}.title`), description: t(`${mode}.description`), confirmLabel: t(`${mode}.confirm`), destructive: true }))) return;

    reset.mutate({}, { onSuccess: () => router.refresh() });
  }, [confirm, mode, reset, router, t]);

  return { isResetting: reset.isPending, onReset };
}
