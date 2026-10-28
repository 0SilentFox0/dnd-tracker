"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { IMPORT_ACCEPT } from "@/lib/utils/content/import/wizard";

export function FileStep({ wizard }: { wizard: ContentImportState }) {
  return (
    <div className="space-y-3">
      <Label htmlFor="content-import-file">Файл CSV, TSV або JSON</Label>
      <Input
        id="content-import-file"
        type="file"
        accept={IMPORT_ACCEPT}
        disabled={wizard.status.busy}
        onChange={(e) => {
          const file = e.target.files?.[0];

          if (file) void wizard.actions.selectFile(file);
        }}
      />
      <p>Багатокатегорійний JSON автоматично відкриє кампанійний майстер без колонок та AI.</p>
      <p className="text-xs text-hud-muted">Excel чи Google Таблиці: «Файл → Зберегти як → CSV (UTF-8)». Роздільник (кома, крапка з комою, табуляція) визначається сам.</p>
      <a className="text-sm underline" href={wizard.urls.example} download>
        Завантажити приклад CSV
      </a>
    </div>
  );
}
