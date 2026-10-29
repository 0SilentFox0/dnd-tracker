"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { campaignKeys } from "./keys";

import { ApiError } from "@/lib/api/client";
import { getCustomConditionUsage, removeCustomConditions } from "@/lib/api/rules";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { isConditionUsed } from "@/lib/utils/rules";
import type { ConditionUsage } from "@/types/campaigns";

export function useRemoveCustomCondition(campaignId: string) {
  const queryClient = useQueryClient();

  const confirm = useConfirm();

  const notify = useNotify();

  const t = useTranslations("rules");

  const [usage, setUsage] = useState<ConditionUsage | null>(null);

  const mutation = useMutation({
    mutationFn: (key: string) => removeCustomConditions(campaignId, [key]),
    onSuccess: (rules) => queryClient.setQueryData(campaignKeys.rules(campaignId), rules),
  });

  const fetchUsage = (key: string) => queryClient.fetchQuery({ queryKey: campaignKeys.conditionUsage(campaignId, key), queryFn: () => getCustomConditionUsage(campaignId, key), staleTime: 0 });

  const remove = async (condition: { key: string; name: string }) => {
    try {
      const found = await fetchUsage(condition.key);

      if (isConditionUsed(found)) {
        setUsage(found);

        return;
      }

      const ok = await confirm({ title: t("customConditions.confirmTitle", { name: condition.name }), description: t("customConditions.confirm"), confirmLabel: t("customConditions.remove"), destructive: true });

      if (!ok) return;

      await mutation.mutateAsync(condition.key);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setUsage(await fetchUsage(condition.key));

        return;
      }

      await notify(error instanceof Error ? error.message : t("form.saveFailed"));
    }
  };

  return { remove, isPending: mutation.isPending, usage, closeUsage: () => setUsage(null) };
}
