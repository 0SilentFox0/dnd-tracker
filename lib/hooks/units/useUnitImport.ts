"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { importUnits } from "@/lib/api/units";
import { useFileImport } from "@/lib/hooks/common";
import { parseCSVFile, parseJSONFile } from "@/lib/utils/common/file-import";
import { convertCSVRowToUnit } from "@/lib/utils/common/unit-parsing";
import type { CSVUnitRow, ImportUnit } from "@/types/import";

export function useUnitImport(campaignId: string) {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (units: ImportUnit[]) => importUnits(campaignId, { units }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["units", campaignId] }),
  });

  return useFileImport<ImportUnit>({
    onImport: async (units) => {
      const { imported, total, skipped, unknownRaces } = await importMutation.mutateAsync(units);

      return {
        imported,
        total,
        skipped,
        warnings: unknownRaces.length > 0 ? [`Раси не знайдено — юніти створено без раси: ${unknownRaces.join(", ")}`] : [],
      };
    },
    parseCSV: async (file) => (await parseCSVFile<CSVUnitRow>(file, ";")).map(convertCSVRowToUnit),
    parseJSON: (file) => parseJSONFile<ImportUnit>(file),
  });
}
