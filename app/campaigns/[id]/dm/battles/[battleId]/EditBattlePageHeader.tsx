"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

interface EditBattlePageHeaderProps {
  campaignId: string;
  onDelete: () => void;
  isDeleting: boolean;
}

export function EditBattlePageHeader({
  campaignId,
  onDelete,
  isDeleting,
}: EditBattlePageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Редагувати сцену бою</h1>
        <p className="text-muted-foreground mt-1">
          Оновіть учасників та їх ролі в битві
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Видалення..." : "Видалити"}
        </Button>
        <Link href={`/campaigns/${campaignId}/dm/battles`}>
          <Button variant="outline">Назад</Button>
        </Link>
      </div>
    </div>
  );
}
