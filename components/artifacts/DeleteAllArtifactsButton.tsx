"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteAllArtifactsButtonProps {
  campaignId: string;
  artifactsCount: number;
}

export function DeleteAllArtifactsButton({
  campaignId,
  artifactsCount,
}: DeleteAllArtifactsButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);

  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/artifacts`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(data.error || "Не вдалося видалити артефакти");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Помилка при видаленні артефактів");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="whitespace-nowrap text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          disabled={artifactsCount === 0}
          title="Видалити всі артефакти"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Видалити всі
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити всі артефакти?</AlertDialogTitle>
          <AlertDialogDescription>
            Буде видалено всі артефакти кампанії ({artifactsCount}). Сети
            артефактів залишаться, але стануть порожніми. Цю дію не можна
            скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Скасувати</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Видалення…" : "Видалити всі"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
