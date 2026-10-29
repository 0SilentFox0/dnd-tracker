"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations();

  const confirm = useConfirm();

  const remove = useDeleteArtifact(campaignId);

  const handleDelete = () =>
    confirm({
      title: t("artifacts.list.confirmDelete"),
      confirmLabel: t("common.actions.delete"),
      destructive: true,
      onConfirm: () => remove.mutateAsync(artifactId),
    });

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void handleDelete()}
      disabled={remove.isPending}
      className={cn("text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0", className)}
      title={t("artifacts.card.deleteTitle")}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
