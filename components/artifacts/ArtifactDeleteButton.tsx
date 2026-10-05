"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteArtifact } from "@/lib/api/artifacts";
import { useConfirm, useNotify } from "@/lib/hooks/common";

interface ArtifactDeleteButtonProps {
  campaignId: string;
  artifactId: string;
}

export function ArtifactDeleteButton({
  campaignId,
  artifactId,
}: ArtifactDeleteButtonProps) {
  const notify = useNotify();

  const confirm = useConfirm();

  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!(await confirm({ title: "Ви впевнені, що хочете видалити цей артефакт?", confirmLabel: "Видалити", destructive: true }))) return;

    setIsDeleting(true);

    try {
      await deleteArtifact(campaignId, artifactId);

      router.refresh();
    } catch (err) {
      console.error(err);

      void notify("Помилка при видаленні артефакту");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
      title="Видалити артефакт"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
