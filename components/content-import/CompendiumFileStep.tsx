"use client";
import { FormAlert } from "@/components/common/states";
import { HudPanel } from "@/components/hud/page";
import { Input } from "@/components/ui/input";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";

export function CompendiumFileStep({ wizard }: { wizard: CompendiumImportController }) {
  const { busy, error } = wizard.state;

  return <HudPanel className="space-y-3">
    <p className="text-sm">Один файл → перевірка → підтвердження. До підтвердження кампанія не змінюється. JSON UTF-8 до 3 MiB; до 2000 обраних записів за один атомарний імпорт.</p>
    <p className="text-sm text-hud-muted">CSV/TSV та простий JSON таблиці доступні кнопкою «Імпорт» у відповідній бібліотеці.</p>
    <label className="block text-sm">JSON-компендіум<Input className="mt-2" type="file" accept=".json,application/json" disabled={busy} onChange={e => { const file = e.target.files?.[0];

      if (file) void wizard.actions.selectFile(file); }} /></label>
    {busy && <p role="status" className="text-sm text-hud-muted">Обробка…</p>}
    {error && <FormAlert>{error}</FormAlert>}
  </HudPanel>;
}
