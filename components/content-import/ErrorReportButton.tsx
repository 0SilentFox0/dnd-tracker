"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { ContentImportState } from "@/lib/hooks/content-import";
import type { ImportReport } from "@/types/content-import";

export function ErrorReportButton({ wizard, report }: { wizard: ContentImportState; report: ImportReport }) {
  const t = useTranslations("contentImport.errorReport");

  if (report.counts.error === 0) return null;

  return (
    <Button type="button" variant="outline" size="sm" onClick={wizard.actions.downloadErrors}>
      {t("download")}
    </Button>
  );
}
