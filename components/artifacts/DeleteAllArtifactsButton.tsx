"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteAllArtifacts } from "@/lib/api/artifacts";
import { useConfirm } from "@/lib/hooks/common";

interface DeleteAllArtifactsButtonProps {
  campaignId: string;
  artifactsCount: number;
}

export function DeleteAllArtifactsButton({
  campaignId,
  artifactsCount,
}: DeleteAllArtifactsButtonProps) {
  const router = useRouter();

  const confirm = useConfirm();

  const handleClick = async () => {
    const ok = await confirm({
      title: "Видалити всі артефакти?",
      description: `Буде видалено всі артефакти кампанії (${artifactsCount}). Сети артефактів залишаться, але стануть порожніми. Цю дію не можна скасувати.`,
      confirmLabel: "Видалити всі",
      destructive: true,
      onConfirm: () => deleteAllArtifacts(campaignId),
    });

    if (ok) router.refresh();
  };

  return (
    <Button
      variant="outline"
      className="whitespace-nowrap text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
      disabled={artifactsCount === 0}
      title="Видалити всі артефакти"
      onClick={handleClick}
    >
      <Trash2 className="h-4 w-4 mr-1.5" />
      Видалити всі
    </Button>
  );
}
