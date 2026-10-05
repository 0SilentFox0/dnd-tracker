"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDeleteAllArtifacts } from "@/lib/hooks/artifacts";
import { useConfirm } from "@/lib/hooks/common";

interface DeleteAllArtifactsButtonProps {
  campaignId: string;
  artifactsCount: number;
}

export function DeleteAllArtifactsButton({
  campaignId,
  artifactsCount,
}: DeleteAllArtifactsButtonProps) {
  const confirm = useConfirm();

  const deleteAll = useDeleteAllArtifacts(campaignId);

  const handleClick = () =>
    confirm({
      title: "Видалити всі артефакти?",
      description: `Буде видалено всі артефакти кампанії (${artifactsCount}). Сети артефактів залишаться, але стануть порожніми. Цю дію не можна скасувати.`,
      confirmLabel: "Видалити всі",
      destructive: true,
      onConfirm: () => deleteAll.mutateAsync(),
    });

  return (
    <Button
      variant="outline"
      className="whitespace-nowrap text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
      disabled={artifactsCount === 0 || deleteAll.isPending}
      title="Видалити всі артефакти"
      onClick={() => void handleClick()}
    >
      <Trash2 className="h-4 w-4 mr-1.5" />
      Видалити всі
    </Button>
  );
}
