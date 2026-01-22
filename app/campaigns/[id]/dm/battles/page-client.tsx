"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteAllBattlesButtonProps {
  campaignId: string;
  battlesCount: number;
}

export function DeleteAllBattlesButton({
  campaignId,
  battlesCount,
}: DeleteAllBattlesButtonProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/battles`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Помилка при видаленні битв");
      }

      // Оновлюємо сторінку
      router.refresh();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting all battles:", error);
      alert("Не вдалося видалити всі битви. Спробуйте ще раз.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (battlesCount === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="destructive"
        className="whitespace-nowrap text-xs sm:text-sm"
        onClick={() => setShowDeleteDialog(true)}
      >
        Видалити всі
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити всі битви?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія видалить всі сцени бою з кампанії ({battlesCount} битв).
              Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Видалення..." : "Видалити всі"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
