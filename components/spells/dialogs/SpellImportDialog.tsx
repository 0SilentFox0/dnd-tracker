"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ImportDialog } from "@/components/common/ImportDialog";
import { SpellType } from "@/lib/constants/spell-abilities";
import { useFileImport } from "@/lib/hooks/useFileImport";
import { parseCSVFile, parseJSONFile } from "@/lib/utils/common/file-import";
import {
  determineConcentration,
  determineSavingThrowAbility,
  determineSavingThrowOnSuccess,
  determineSpellDamageType,
  determineSpellType,
  extractDamageDice,
  normalizeSchoolName,
} from "@/lib/utils/spells/spell-parsing";
import type {
  CSVSpellRow,
  ImportSpell,
  SpellImportResult,
} from "@/types/import";

interface SpellImportDialogProps {
  campaignId: string;
}

export function SpellImportDialog({ campaignId }: SpellImportDialogProps) {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (spells: ImportSpell[]): Promise<SpellImportResult> => {
      const response = await fetch(
        `/api/campaigns/${campaignId}/spells/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ spells }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        throw new Error(errorData.error || "Помилка при імпорті заклинань");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["spellGroups", campaignId] });
    },
  });

  // Конвертуємо CSV рядки в формат для імпорту
  const convertCSVToImportFormat = (
    csvSpells: CSVSpellRow[]
  ): ImportSpell[] => {
    return csvSpells.map((row) => {
      const level = parseInt(row.Level || row.level || "0", 10) || 0;

      const effect = (row.Effect || row.effect || "").trim();

      // Use utility functions
      const type = determineSpellType(effect);

      const damageType = determineSpellDamageType(effect);

      const damageDice = extractDamageDice(effect);

      const savingThrowAbility = determineSavingThrowAbility(effect);

      const savingThrowOnSuccess = savingThrowAbility
        ? determineSavingThrowOnSuccess(effect)
        : undefined;

      const concentration = determineConcentration(effect);

      const schoolName = (row.School || row.school || "").trim();

      const school = schoolName ? normalizeSchoolName(schoolName) : undefined;

      return {
        name: (row["UA Name"] || row.name || row.Name || "").trim(),
        level,
        school,
        type,
        damageType,
        castingTime: "1 action",
        range: type === SpellType.AOE ? "60 feet" : "Touch",
        components: "V, S",
        duration: concentration
          ? "Concentration, up to 1 minute"
          : "Instantaneous",
        concentration,
        damageDice,
        savingThrowAbility,
        savingThrowOnSuccess,
        description: `${row["Original Name"] || row.originalName || ""} (${
          row["UA Name"] || row.name || ""
        }): ${effect}`,
        groupId: undefined,
      };
    });
  };

  // Парсимо CSV файл
  const parseCSV = async (file: File): Promise<ImportSpell[]> => {
    const csvRows = await parseCSVFile<CSVSpellRow>(file, ",");

    return convertCSVToImportFormat(csvRows);
  };

  // Парсимо JSON файл
  const parseJSON = async (file: File): Promise<ImportSpell[]> => {
    return parseJSONFile<ImportSpell>(file);
  };

  // Використовуємо загальний хук для імпорту
  const importHook = useFileImport<ImportSpell>({
    onImport: async (spells: ImportSpell[]) => {
      const result = await importMutation.mutateAsync(spells);

      return {
        imported: result.imported,
        total: result.total,
      };
    },
    parseCSV,
    parseJSON,
  });

  return (
    <ImportDialog
      triggerLabel="Імпортувати заклинання"
      title="Імпорт заклинань"
      description="Завантажте CSV або JSON файл з заклинаннями для масового імпорту"
      importHook={importHook}
    />
  );
}
