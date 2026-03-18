"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ImportDialog } from "@/components/common/ImportDialog";
import { importUnits } from "@/lib/api/units";
import { useFileImport } from "@/lib/hooks/common";
import { parseCSVFile, parseJSONFile } from "@/lib/utils/common/file-import";
import { convertCSVRowToUnit } from "@/lib/utils/common/unit-parsing";
import type {
  CSVUnitRow,
  ImportUnit,
  UnitImportResult,
} from "@/types/import";

interface UnitImportDialogProps {
  campaignId: string;
}

export function UnitImportDialog({ campaignId }: UnitImportDialogProps) {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (
      units: Array<ImportUnit & { groupName?: string }>
    ): Promise<UnitImportResult> => {
      return importUnits(campaignId, { units }) as Promise<UnitImportResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["unitGroups", campaignId] });
    },
  });

  // Конвертуємо CSV рядки в формат для імпорту
  const convertCSVToImportFormat = (
    csvUnits: CSVUnitRow[]
  ): Array<ImportUnit & { groupName?: string }> => {
    return csvUnits.map((row) => {
      const { unit, groupName } = convertCSVRowToUnit(row);

      return {
        ...unit,
        groupName,
      };
    });
  };

  // Парсимо CSV файл (використовуємо крапку з комою як роздільник для юнітів)
  const parseCSV = async (
    file: File
  ): Promise<Array<ImportUnit & { groupName?: string }>> => {
    const csvRows = await parseCSVFile<CSVUnitRow>(file, ";");

    return convertCSVToImportFormat(csvRows);
  };

  // Парсимо JSON файл
  const parseJSON = async (
    file: File
  ): Promise<Array<ImportUnit & { groupName?: string }>> => {
    const jsonData = await parseJSONFile<ImportUnit>(file);

    return jsonData.map((u) => ({ ...u, groupName: undefined }));
  };

  // Використовуємо загальний хук для імпорту
  const importHook = useFileImport<ImportUnit & { groupName?: string }>({
    onImport: async (units: Array<ImportUnit & { groupName?: string }>) => {
      const result = await importMutation.mutateAsync(units);

      return {
        imported: result.imported,
        total: result.total,
        skipped: result.skipped,
      };
    },
    parseCSV,
    parseJSON,
  });

  return (
    <ImportDialog
      triggerLabel="Імпортувати юніти"
      title="Імпорт юнітів"
      description="Завантажте CSV або JSON файл з юнітами для масового імпорту"
      importHook={importHook}
    />
  );
}
