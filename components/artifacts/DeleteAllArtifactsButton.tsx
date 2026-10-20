"use client";

import { Trash2 } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { useDeleteAllArtifacts } from "@/lib/hooks/artifacts";

interface DeleteAllArtifactsButtonProps {
  campaignId: string;
  artifactsCount: number;
}

export function DeleteAllArtifactsButton({ campaignId, artifactsCount }: DeleteAllArtifactsButtonProps) {
  const deleteAll = useDeleteAllArtifacts(campaignId);

  return (
    <DeleteAllButton
      count={artifactsCount}
      nouns={["артефакт", "артефакти", "артефактів"]}
      view={{ variant: "soft", icon: <Trash2 className="h-4 w-4 mr-1.5" /> }}
      confirm={{ description: `Буде видалено всі артефакти кампанії (${artifactsCount}). Сети артефактів залишаться, але стануть порожніми. Цю дію не можна скасувати.` }}
      status={{ isPending: deleteAll.isPending }}
      actions={{ onConfirm: () => deleteAll.mutateAsync() }}
    />
  );
}
