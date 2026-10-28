"use client";
import { Input } from "@/components/ui/input";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";

export function CompendiumFileStep({ wizard }: { wizard: CompendiumImportController }) {
  const { busy, error } = wizard.state;

  return <>
    <h1 className="text-xl">Імпорт JSON-компендіуму</h1>
    <p>Один файл → перевірка → підтвердження. До підтвердження кампанія не змінюється. JSON UTF-8 до 3 MiB; до 2000 обраних записів за один атомарний імпорт.</p>
    <p>CSV/TSV та простий JSON таблиці доступні кнопкою «Імпорт» у відповідній бібліотеці.</p>
    <label className="block">JSON-компендіум<Input type="file" accept=".json,application/json" disabled={busy} onChange={e => { const file = e.target.files?.[0];

      if (file) void wizard.actions.selectFile(file); }} /></label>
    {busy && <p role="status">Обробка…</p>}
    {error && <p role="alert">{error}</p>}
  </>;
}
