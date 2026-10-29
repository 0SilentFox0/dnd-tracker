"use client";

import { useTranslations } from "next-intl";

import { ColumnsStep } from "./steps/ColumnsStep";
import { FileStep } from "./steps/FileStep";
import { PreviewStep } from "./steps/PreviewStep";
import { ResultStep } from "./steps/ResultStep";
import { CompendiumImport } from "./CompendiumImport";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useContentImport } from "@/lib/hooks/content-import";
import type { ImportKind } from "@/types/content-import";

interface ContentImportWizardProps {
  campaignId: string;
  kind: ImportKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContentImportWizard({ campaignId, kind, open, onOpenChange }: ContentImportWizardProps) {
  const t = useTranslations("contentImport");

  const tc = useTranslations("common.actions");

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
        {tc("cancel")}
      </Button>
    ),
    columns: (
      <>
        <Button variant="outline" onClick={wizard.actions.back} disabled={busy}>
          {tc("back")}
        </Button>
        <Button onClick={() => void wizard.actions.runPreview()} disabled={busy || wizard.mapping.missing.length > 0}>
          {busy ? t("wizard.checking") : t("wizard.check")}
        </Button>
      </>
    ),
    preview: (
      <>
        <Button variant="outline" onClick={wizard.actions.back} disabled={busy}>
          {tc("back")}
        </Button>
        <Button onClick={() => void wizard.actions.runImport()} disabled={busy || planned === 0}>
          {progress ? t("wizard.importing", { done: progress.done, total: progress.total }) : t("wizard.importCount", { count: planned })}
        </Button>
      </>
    ),
    result: <Button onClick={() => close(false)}>{t("actions.done")}</Button>,
  }[wizard.step];

  if (wizard.aggregateFile) return <ResponsiveDialog hud size="lg" open={open} onOpenChange={close} title={t("wizard.compendiumTitle")}><CompendiumImport campaignId={campaignId} initialFile={wizard.aggregateFile} /></ResponsiveDialog>;

  return (
    <ResponsiveDialog hud size="lg" open={open} onOpenChange={close} title={t("wizard.title", { kind: t(`kinds.${kind}`) })} description={t(`wizard.steps.${wizard.step}`)} footer={footer}>
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
