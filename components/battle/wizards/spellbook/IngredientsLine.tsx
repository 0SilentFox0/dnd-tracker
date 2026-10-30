import { useTranslations } from "next-intl";

import type { IngredientLine } from "@/lib/hooks/battle/useIngredientPlan";

export function IngredientsLine({ line }: { line: IngredientLine | null }) {
  const t = useTranslations("battleWizards.spell.ingredients");

  if (!line) return null;

  return (
    <div className="mt-2 text-sm" data-testid="ingredients-line">
      <p>{t("need", { list: line.need })}</p>
      {line.blocked && <p className="text-destructive">{t("missing", { list: line.missing })}</p>}
      {!line.blocked && line.payGp > 0 && <p className="text-xs italic text-[var(--hud-muted)]">{t("autoPay", { gp: line.payGp })}</p>}
    </div>
  );
}
