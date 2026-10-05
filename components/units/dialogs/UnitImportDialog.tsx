"use client";

import { ImportDialog } from "@/components/common/ImportDialog";
import { useUnitImport } from "@/lib/hooks/units";

interface UnitImportDialogProps {
  campaignId: string;
}

export function UnitImportDialog({ campaignId }: UnitImportDialogProps) {
  const importHook = useUnitImport(campaignId);

  return (
    <ImportDialog
      triggerLabel="Імпортувати юніти"
      title="Імпорт юнітів"
      description="Завантажте CSV або JSON файл з юнітами для масового імпорту"
      importHook={importHook}
    />
  );
}
