"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ArtifactDeleteButtonProps {
  campaignId: string;
  artifactId: string;
}

export function ArtifactDeleteButton({
  campaignId,
  artifactId,
}: ArtifactDeleteButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Ви впевнені, що хочете видалити цей артефакт?")) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/artifacts/${artifactId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Не вдалося видалити артефакт");
      }

      router.refresh();
    } catch (err) {
      console.error(err);

      alert("Помилка при видаленні артефакту");
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
