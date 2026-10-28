"use client";

import { unitWriteKeys } from "./keys";

import { importUnits } from "@/lib/api/units";
import { useCrudMutation, useFileImport } from "@/lib/hooks/common";
import { parseCSVFile, parseJSONFile } from "@/lib/utils/common/file-import";
import { convertCSVRowToUnit } from "@/lib/utils/units/unit-parsing";
import type { CSVUnitRow, ImportUnit } from "@/types/import";

export function useUnitImport(campaignId: string) {
  const importMutation = useCrudMutation({
    mutationFn: (units: ImportUnit[]) => importUnits(campaignId, { units }),
    invalidateKeys: unitWriteKeys(campaignId),
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
