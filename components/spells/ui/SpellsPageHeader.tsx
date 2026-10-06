import Link from "next/link";
import { Printer } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { CreateSpellGroupDialog } from "@/components/skills/dialogs/CreateSpellGroupDialog";
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
      actions={
        <>
          <SpellImportDialog campaignId={campaignId} />
          <CreateSpellGroupDialog campaignId={campaignId} />
          <Link href={`/campaigns/${campaignId}/dm/spells/new`}>
            <Button className="whitespace-nowrap text-xs sm:text-sm">
              + Створити заклинання
            </Button>
          </Link>
          {spellsCount > 0 && (
            <Link
              href={`/campaigns/${campaignId}/dm/print/spells`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                className="whitespace-nowrap text-xs sm:text-sm"
              >
                <Printer className="h-4 w-4 mr-1" />
                Версія для друку
              </Button>
            </Link>
          )}
          {spellsCount > 0 && (
            <Button
              variant="destructive"
              className="whitespace-nowrap text-xs sm:text-sm"
              onClick={onDeleteAll}
            >
              Видалити всі заклинання
            </Button>
          )}
        </>
      }
    />
  );
}
