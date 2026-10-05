"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { importUnits } from "@/lib/api/units";
import { useFileImport } from "@/lib/hooks/common";
import { parseCSVFile, parseJSONFile } from "@/lib/utils/common/file-import";
import { convertCSVRowToUnit } from "@/lib/utils/common/unit-parsing";
import type { CSVUnitRow, ImportUnit, UnitImportResult } from "@/types/import";

type ImportUnitRow = ImportUnit & { groupName?: string };

export function useUnitImport(campaignId: string) {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (units: ImportUnitRow[]) => importUnits(campaignId, { units }) as Promise<UnitImportResult>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["units", campaignId] });
      void queryClient.invalidateQueries({ queryKey: ["unitGroups", campaignId] });
    },
  });

  return useFileImport<ImportUnitRow>({
    onImport: async (units) => {
      const { imported, total, skipped } = await importMutation.mutateAsync(units);

      return { imported, total, skipped };
    },
    parseCSV: async (file) =>
      (await parseCSVFile<CSVUnitRow>(file, ";")).map((row) => {
        const { unit, groupName } = convertCSVRowToUnit(row);

        return { ...unit, groupName };
      }),
    parseJSON: async (file) => (await parseJSONFile<ImportUnit>(file)).map((u) => ({ ...u, groupName: undefined })),
  });
}
