"use client";

import { Button } from "@/components/ui/button";
import { useDeleteAllBattles } from "@/lib/hooks/battles";
import { useConfirm } from "@/lib/hooks/common";

interface DeleteAllBattlesButtonProps {
  campaignId: string;
  battlesCount: number;
}

export function DeleteAllBattlesButton({
  campaignId,
  battlesCount,
}: DeleteAllBattlesButtonProps) {
  const confirm = useConfirm();

  const deleteAll = useDeleteAllBattles(campaignId);

  if (battlesCount === 0) {
    return null;
  }

  const handleClick = () =>
    confirm({
      title: "Видалити всі битви?",
      description: `Ця дія видалить всі сцени бою з кампанії (${battlesCount} битв). Цю дію неможливо скасувати.`,
      confirmLabel: "Видалити всі",
      destructive: true,
      onConfirm: () => deleteAll.mutateAsync(),
    });

  return (
    <Button
      variant="destructive"
      className="whitespace-nowrap text-xs sm:text-sm"
      onClick={() => void handleClick()}
      disabled={deleteAll.isPending}
    >
      Видалити всі
    </Button>
  );
}
