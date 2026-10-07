"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { useDeleteAllArtifacts } from "@/lib/hooks/artifacts";

interface DeleteAllArtifactsButtonProps {
  campaignId: string;
  artifactsCount: number;
}

export function DeleteAllArtifactsButton({ campaignId, artifactsCount }: DeleteAllArtifactsButtonProps) {
  const router = useRouter();

  const deleteAll = useDeleteAllArtifacts(campaignId);

  return (
    <DeleteAllButton
      count={artifactsCount}
      nouns={["артефакт", "артефакти", "артефактів"]}
      variant="soft"
      icon={<Trash2 className="h-4 w-4 mr-1.5" />}
      description={`Буде видалено всі артефакти кампанії (${artifactsCount}). Сети артефактів залишаться, але стануть порожніми. Цю дію не можна скасувати.`}
      pending={deleteAll.isPending}
      onConfirm={async () => {
        await deleteAll.mutateAsync();
        router.refresh();
      }}
    />
  );
}
