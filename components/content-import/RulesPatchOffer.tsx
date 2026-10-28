"use client";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { describeRulesPatch } from "@/lib/utils/compendium-import/labels";

export function RulesPatchOffer({ wizard }: { wizard: CompendiumImportController }) {
  const { preview, options, busy } = wizard.state;

  const patch = preview?.report.recommendedRulesPatch;

  if (!patch) return null;

  return <div className="space-y-1 rounded-lg border border-hud-gold p-3 text-sm">
    {"classes" in patch && <p>Раси, передісторії й риси з файлу не збираються на листі героя, поки в кампанії вимкнений режим класів 5e або немає базових класів.</p>}
    {"conditions" in patch && <p>Файл визначає власні стани: без них заклинання, що їх накладають, у бою нічого не зроблять.</p>}
    <label className="flex items-start gap-2"><input className="mt-0.5 h-4 w-4 shrink-0 accent-hud-gold" type="checkbox" checked={!!options.rulesPatch} disabled={busy} onChange={e => wizard.actions.applyOptions({ ...options, rulesPatch: e.target.checked ? patch : undefined })} /> Застосувати з імпортом: {describeRulesPatch(patch)} (і повторити перевірку)</label>
  </div>;
}
