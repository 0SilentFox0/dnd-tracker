"use client";

import { useTranslations } from "next-intl";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { useDeleteAllBattles } from "@/lib/hooks/battles";

export function DeleteAllBattlesButton({ campaignId, battlesCount }: { campaignId: string; battlesCount: number }) {
  const t = useTranslations("battleSetup.list.deleteAll");

  const deleteAll = useDeleteAllBattles(campaignId);

  return (
    <DeleteAllButton
      count={battlesCount}
      noun={t("noun")}
      confirm={{ description: t("description", { count: battlesCount }) }}
      status={{ isPending: deleteAll.isPending }}
      actions={{ onConfirm: () => deleteAll.mutateAsync() }}
    />
  );
}
