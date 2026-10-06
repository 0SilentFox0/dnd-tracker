"use client";

import Link from "next/link";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { UnitImportDialog } from "@/components/units/dialogs/UnitImportDialog";

interface UnitsPageHeaderProps {
  campaignId: string;
  unitsCount: number;
  onDeleteAll: () => void;
}

export function UnitsPageHeader({ campaignId, unitsCount, onDeleteAll }: UnitsPageHeaderProps) {
  return (
    <PageHeader title="NPC Юніти" description="Управління мобами та юнітами" stats={unitsCount}>
      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <UnitImportDialog campaignId={campaignId} />
        <Button variant="outline" className="w-full whitespace-nowrap text-xs sm:text-sm" asChild>
          <Link href={`/campaigns/${campaignId}/dm/races`}>+ Раса</Link>
        </Button>
        <Button className="w-full whitespace-nowrap text-xs sm:text-sm" asChild>
          <Link href={`/campaigns/${campaignId}/dm/units/new`}>+ Створити юніта</Link>
        </Button>
        {unitsCount > 0 && (
          <Button variant="destructive" className="w-full justify-center whitespace-nowrap text-xs sm:text-sm" onClick={onDeleteAll}>
            Видалити всі юніти
          </Button>
        )}
      </div>
    </PageHeader>
  );
}
