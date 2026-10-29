"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentImportState } from "@/lib/hooks/content-import";
import { IMPORT_ACCEPT } from "@/lib/utils/content/import/wizard";

export function FileStep({ wizard }: { wizard: ContentImportState }) {
  const t = useTranslations("contentImport.file");

  return (
    <div className="space-y-3">
      <Label htmlFor="content-import-file">{t("label")}</Label>
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
      <p>{t("aggregateHint")}</p>
      <p className="text-xs text-hud-muted">{t("spreadsheetHint")}</p>
      <a className="text-sm underline" href={wizard.urls.example} download>
        {t("example")}
      </a>
    </div>
  );
}
