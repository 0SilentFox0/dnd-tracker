"use client";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { useTranslator } from "@/lib/i18n/use-translator";
import { describeRulesPatch } from "@/lib/utils/compendium-import/labels";

export function RulesPatchOffer({ wizard }: { wizard: CompendiumImportController }) {
  const t = useTranslator("compendium");

  const { preview, options, busy } = wizard.state;

  const patch = preview?.report.recommendedRulesPatch;

  if (!patch) return null;

  return <div className="space-y-1 rounded-lg border border-hud-gold p-3 text-sm">
    <p>{t("rulesOffer.text")}</p>
    <label className="flex items-start gap-2"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={!!options.rulesPatch} disabled={busy} onChange={e => wizard.actions.applyOptions({ ...options, rulesPatch: e.target.checked ? patch : undefined })} /> {t("rulesOffer.apply", { summary: describeRulesPatch(t, patch) })}</label>
  </div>;
}
