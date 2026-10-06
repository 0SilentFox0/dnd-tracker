"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { UnitImportDialog } from "@/components/units/dialogs/UnitImportDialog";

interface UnitsPageHeaderProps {
  campaignId: string;
  unitsCount: number;
  onDeleteAll: () => void;
  children?: ReactNode;
}

export function UnitsPageHeader({ campaignId, unitsCount, onDeleteAll, children }: UnitsPageHeaderProps) {
  return (
    <PageHeader
      title="NPC Юніти"
      description="Управління мобами та юнітами"
      stats={unitsCount}
      actions={
        <>
          <UnitImportDialog campaignId={campaignId} />
          <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
            <Link href={`/campaigns/${campaignId}/dm/races`}>+ Раса</Link>
          </Button>
          <Button className="whitespace-nowrap text-xs sm:text-sm" asChild>
            <Link href={`/campaigns/${campaignId}/dm/units/new`}>+ Створити юніта</Link>
          </Button>
          {unitsCount > 0 && (
            <Button variant="destructive" className="whitespace-nowrap text-xs sm:text-sm" onClick={onDeleteAll}>
              Видалити всі юніти
            </Button>
          )}
        </>
      }
    >
      {children}
    </PageHeader>
  );
}
