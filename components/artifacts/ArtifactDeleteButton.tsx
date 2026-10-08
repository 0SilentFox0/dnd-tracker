"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDeleteArtifact } from "@/lib/hooks/artifacts";
import { useConfirm } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";

interface ArtifactDeleteButtonProps {
  campaignId: string;
  artifactId: string;
  className?: string;
}

export function ArtifactDeleteButton({
  campaignId,
  artifactId,
  className,
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
      className={cn("text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0", className)}
      title="Видалити артефакт"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
