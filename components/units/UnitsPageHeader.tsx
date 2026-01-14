import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UnitImportDialog } from "@/components/units/UnitImportDialog";

interface UnitsPageHeaderProps {
  campaignId: string;
  unitsCount: number;
  onDeleteAll: () => void;
}

export function UnitsPageHeader({
  campaignId,
  unitsCount,
  onDeleteAll,
}: UnitsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold truncate">NPC Юніти</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Управління мобами та юнітами
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 shrink-0">
        <UnitImportDialog campaignId={campaignId} />
        <Link href={`/campaigns/${campaignId}/dm/units/groups/new`}>
          <Button
            variant="outline"
            className="whitespace-nowrap text-xs sm:text-sm w-full"
          >
            + Група
          </Button>
        </Link>
        <Link href={`/campaigns/${campaignId}/dm/units/new`}>
          <Button className="whitespace-nowrap text-xs sm:text-sm w-full">
            + Створити юніта
          </Button>
        </Link>
        {unitsCount > 0 && (
          <Button
            variant="destructive"
            className="whitespace-nowrap text-xs sm:text-sm w-full justify-center"
            onClick={onDeleteAll}
          >
            Видалити всі юніти
          </Button>
        )}
      </div>
    </div>
  );
}
