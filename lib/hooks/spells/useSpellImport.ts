"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { spellKeys } from "./keys";

import { importSpells } from "@/lib/api/spells";
import { useFileImport } from "@/lib/hooks/common";
import { parseCSVFile, parseJSONFile } from "@/lib/utils/common/file-import";
import { csvRowToImportSpell } from "@/lib/utils/spells/spell-import";
import type { CSVSpellRow, ImportSpell, SpellImportResult } from "@/types/import";

export function useSpellImport(campaignId: string) {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (spells: ImportSpell[]) => importSpells(campaignId, { spells }) as Promise<SpellImportResult>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: spellKeys.list(campaignId) });
      void queryClient.invalidateQueries({ queryKey: spellKeys.groups(campaignId) });
    },
  });

  return useFileImport<ImportSpell>({
    onImport: async (spells) => {
      const { imported, total } = await importMutation.mutateAsync(spells);

      return { imported, total };
    },
    parseCSV: async (file) => (await parseCSVFile<CSVSpellRow>(file, ",")).map(csvRowToImportSpell),
    parseJSON: (file) => parseJSONFile<ImportSpell>(file),
  });
}
