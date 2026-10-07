"use client";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { useDeleteAllBattles } from "@/lib/hooks/battles";

export function DeleteAllBattlesButton({ campaignId, battlesCount }: { campaignId: string; battlesCount: number }) {
  const deleteAll = useDeleteAllBattles(campaignId);

  return (
    <DeleteAllButton
      count={battlesCount}
      nouns={["битва", "битви", "битв"]}
      description={`Ця дія видалить всі сцени бою з кампанії (${battlesCount} битв). Цю дію неможливо скасувати.`}
      pending={deleteAll.isPending}
      onConfirm={() => deleteAll.mutateAsync()}
    />
  );
}
