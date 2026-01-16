import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SpellImportDialog } from "@/components/spells/SpellImportDialog";
import { CreateGroupDialog } from "@/components/skills/CreateGroupDialog";

interface SpellsPageHeaderProps {
  campaignId: string;
  spellsCount: number;
  onDeleteAll: () => void;
}

export function SpellsPageHeader({
  campaignId,
  spellsCount,
  onDeleteAll,
}: SpellsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex flex-col min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold truncate">
          Заклинання
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          База заклинань кампанії
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 shrink-0">
        <SpellImportDialog campaignId={campaignId} />
        <CreateGroupDialog campaignId={campaignId} />
        <Link href={`/campaigns/${campaignId}/dm/spells/new`}>
          <Button className="whitespace-nowrap text-xs sm:text-sm w-full">
            + Створити заклинання
          </Button>
        </Link>
        {spellsCount > 0 && (
          <Button
            variant="destructive"
            className="whitespace-nowrap text-xs sm:text-sm w-full justify-center"
            onClick={onDeleteAll}
          >
            Видалити всі заклинання
          </Button>
        )}
      </div>
    </div>
  );
}
