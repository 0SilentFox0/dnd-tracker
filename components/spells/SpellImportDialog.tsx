"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import type {
  CSVSpellRow,
  ImportSpell,
  SpellImportResult,
} from "@/lib/types/spell-import";
import { SpellType } from "@/lib/constants/spell-abilities";
import {
  determineSpellType,
  determineSpellDamageType,
  extractDamageDice,
  determineSavingThrowAbility,
  determineSavingThrowOnSuccess,
  determineConcentration,
  normalizeSchoolName,
} from "@/lib/utils/spell-parsing";

interface SpellImportDialogProps {
  campaignId: string;
}

export function SpellImportDialog({ campaignId }: SpellImportDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    imported: number;
    total: number;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);

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
    onSuccess: (result) => {
      setSuccess({
        imported: result.imported,
        total: result.total,
      });
      queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["spellGroups", campaignId] });

      setTimeout(() => {
        setOpen(false);
        setFile(null);
        setSuccess(null);
      }, 2000);
    },
    onError: (err: Error) => {
      setError(err.message || "Помилка при імпорті заклинань");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext !== "csv" && ext !== "json") {
        setError("Підтримуються тільки CSV та JSON файли");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const parseCSV = async (file: File): Promise<CSVSpellRow[]> => {
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length === 0) throw new Error("CSV файл порожній");

    // Простий CSV парсер, який враховує коми в лапках
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = i < line.length - 1 ? line[i + 1] : null;

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Подвійні лапки - екранована лапка
            current += '"';
            i++; // Пропускаємо наступну лапку
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Парсимо заголовки
    const headers = parseCSVLine(lines[0]);
    const spells: CSVSpellRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      // Якщо кількість колонок не співпадає, об'єднуємо зайві колонки в останнє поле
      if (values.length > headers.length) {
        const lastIndex = headers.length - 1;
        const extraValues = values.slice(lastIndex);
        values.splice(
          lastIndex,
          values.length - lastIndex,
          extraValues.join(", ")
        );
      }

      if (values.length < headers.length) {
        // Додаємо порожні значення для відсутніх колонок
        while (values.length < headers.length) {
          values.push("");
        }
      }

      const spell: CSVSpellRow = {} as CSVSpellRow;
      headers.forEach((header, index) => {
        // Видаляємо лапки якщо є
        let value = values[index] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        spell[header] = value;
      });
      spells.push(spell);
    }

    return spells;
  };

  const parseJSON = async (file: File): Promise<ImportSpell[]> => {
    const text = await file.text();
    const data = JSON.parse(text) as ImportSpell | ImportSpell[];
    return Array.isArray(data) ? data : [data];
  };

  const convertCSVToImportFormat = (
    csvSpells: CSVSpellRow[]
  ): ImportSpell[] => {
    return csvSpells.map((row) => {
      const level = parseInt(row.Level || row.level || "0", 10) || 0;
      const effect = (row.Effect || row.effect || "").trim();

      // Визначаємо властивості заклинання через утиліти
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
        groupId: undefined, // Буде встановлено на бекенді на основі School
      };
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError("Виберіть файл для імпорту");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let spells: ImportSpell[];

      if (ext === "csv") {
        const csvData = await parseCSV(file);
        spells = convertCSVToImportFormat(csvData);
      } else if (ext === "json") {
        spells = await parseJSON(file);
      } else {
        throw new Error("Непідтримуваний формат файлу");
      }

      importMutation.mutate(spells);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Помилка при імпорті заклинань";
      setError(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Імпортувати заклинання
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Імпорт заклинань</DialogTitle>
          <DialogDescription>
            Завантажте CSV або JSON файл з заклинаннями для масового імпорту
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Файл</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                disabled={importMutation.isPending}
                className="w-full"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Успішно імпортовано {success.imported} з {success.total}{" "}
                заклинань
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setFile(null);
                setError(null);
                setSuccess(null);
              }}
              disabled={importMutation.isPending}
            >
              Скасувати
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !file}
            >
              {importMutation.isPending ? "Імпорт..." : "Імпортувати"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
