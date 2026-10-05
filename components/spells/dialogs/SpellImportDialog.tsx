"use client";

import { ImportDialog } from "@/components/common/ImportDialog";
import { useSpellImport } from "@/lib/hooks/spells";

interface SpellImportDialogProps {
  campaignId: string;
}

export function SpellImportDialog({ campaignId }: SpellImportDialogProps) {
  const importHook = useSpellImport(campaignId);

  return (
    <ImportDialog
      triggerLabel="Імпортувати заклинання"
      title="Імпорт заклинань"
      description="Завантажте CSV або JSON файл з заклинаннями для масового імпорту"
      importHook={importHook}
    />
  );
}
