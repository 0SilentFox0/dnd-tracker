"use client";
import { useTranslations } from "next-intl";

import { StepIndicator } from "@/components/common/StepIndicator";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";

const KEYS = ["file", "categories", "check", "confirm"] as const;

export function compendiumStep({ root, preview, rights, result }: CompendiumImportController["state"]) {
  if (result) return KEYS.length;

  if (preview) return rights ? 3 : 2;

  return root ? 1 : 0;
}

export function CompendiumSteps({ wizard }: { wizard: CompendiumImportController }) {
  const t = useTranslations("compendium.import.steps");

  return <StepIndicator label={t("label")} steps={KEYS.map(key => t(key))} current={compendiumStep(wizard.state)} />;
}
