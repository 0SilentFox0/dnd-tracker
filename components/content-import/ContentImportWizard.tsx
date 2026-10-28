"use client";

import { ColumnsStep } from "./steps/ColumnsStep";
import { FileStep } from "./steps/FileStep";
import { PreviewStep } from "./steps/PreviewStep";
import { ResultStep } from "./steps/ResultStep";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { type ImportStep, useContentImport } from "@/lib/hooks/content-import";
import type { ImportKind } from "@/types/content-import";

const STEP_HINT: Record<ImportStep, string> = {
  file: "Крок 1 з 4 · файл",
  columns: "Крок 2 з 4 · колонки",
  preview: "Крок 3 з 4 · перевірка",
  result: "Крок 4 з 4 · підсумок",
};

interface ContentImportWizardProps {
  campaignId: string;
  kind: ImportKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentImportWizard({ campaignId, kind, open, onOpenChange }: ContentImportWizardProps) {
  const wizard = useContentImport(campaignId, kind);

  const { busy, progress, error } = wizard.status;

  const close = (next: boolean) => {
    if (!next) wizard.actions.reset();

    onOpenChange(next);
  };

  const planned = wizard.preview ? wizard.preview.counts.created + wizard.preview.counts.updated : 0;

  const footer = {
    file: (
      <Button variant="outline" onClick={() => close(false)}>
        Скасувати
      </Button>
    ),
    columns: (
      <>
        <Button variant="outline" onClick={wizard.actions.back} disabled={busy}>
          Назад
        </Button>
        <Button onClick={() => void wizard.actions.runPreview()} disabled={busy || wizard.mapping.missing.length > 0}>
          {busy ? "Перевірка…" : "Перевірити"}
        </Button>
      </>
    ),
    preview: (
      <>
        <Button variant="outline" onClick={wizard.actions.back} disabled={busy}>
          Назад
        </Button>
        <Button onClick={() => void wizard.actions.runImport()} disabled={busy || planned === 0}>
          {progress ? `Імпорт… ${progress.done}/${progress.total}` : `Імпортувати ${planned}`}
        </Button>
      </>
    ),
    result: <Button onClick={() => close(false)}>Готово</Button>,
  }[wizard.step];

  return (
    <ResponsiveDialog hud size="lg" open={open} onOpenChange={close} title={`Імпорт: ${wizard.spec.label}`} description={STEP_HINT[wizard.step]} footer={footer}>
      <div className="space-y-3">
        {error && wizard.step !== "result" && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        {wizard.step === "file" && <FileStep wizard={wizard} />}
        {wizard.step === "columns" && <ColumnsStep wizard={wizard} />}
        {wizard.step === "preview" && <PreviewStep wizard={wizard} />}
        {wizard.step === "result" && <ResultStep wizard={wizard} />}
      </div>
    </ResponsiveDialog>
  );
}
