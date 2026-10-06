"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDeleteArtifact } from "@/lib/hooks/artifacts";
import { useConfirm } from "@/lib/hooks/common";

interface ArtifactDeleteButtonProps {
  campaignId: string;
  artifactId: string;
}

export function ArtifactDeleteButton({
  campaignId,
  artifactId,
}: ArtifactDeleteButtonProps) {
  const router = useRouter();

  const confirm = useConfirm();

  const remove = useDeleteArtifact(campaignId);

  const handleDelete = () =>
    confirm({
      title: "Ви впевнені, що хочете видалити цей артефакт?",
      confirmLabel: "Видалити",
      destructive: true,
      onConfirm: async () => {
        await remove.mutateAsync(artifactId);
        router.refresh();
      },
    });

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void handleDelete()}
      disabled={remove.isPending}
      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
      title="Видалити артефакт"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
