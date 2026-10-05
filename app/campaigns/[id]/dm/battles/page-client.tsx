"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { deleteAllBattles } from "@/lib/api/battles";
import { useNotify } from "@/lib/hooks/common";

interface DeleteAllBattlesButtonProps {
  campaignId: string;
  battlesCount: number;
}

export function DeleteAllBattlesButton({
  campaignId,
  battlesCount,
}: DeleteAllBattlesButtonProps) {
  const notify = useNotify();

  const router = useRouter();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await deleteAllBattles(campaignId);

      router.refresh();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting all battles:", error);
      void notify("Не вдалося видалити всі битви. Спробуйте ще раз.");
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

      <ResponsiveDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Видалити всі битви?"
        description={<>Ця дія видалить всі сцени бою з кампанії ({battlesCount} битв). Цю дію неможливо скасувати.</>}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>Скасувати</Button>
              <Button variant="destructive"
                onClick={() => {
              void handleDeleteAll();
              setShowDeleteDialog(false);
            }}
                disabled={isDeleting}
              >
                {isDeleting ? "Видалення..." : "Видалити всі"}
              </Button>
          </>
        }
      />
    </>
  );
}
