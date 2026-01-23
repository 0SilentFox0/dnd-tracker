import Link from "next/link";

import { PageHeader } from "@/components/common/PageHeader";
import { CreateGroupDialog } from "@/components/skills/dialogs/CreateGroupDialog";
import { SpellImportDialog } from "@/components/spells/dialogs/SpellImportDialog";
import { Button } from "@/components/ui/button";

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
    <PageHeader
      title="Заклинання"
      description="База заклинань кампанії"
      stats={spellsCount}
    >
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
    </PageHeader>
  );
}
