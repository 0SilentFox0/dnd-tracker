"use client";

import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { HudChipTabs } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import type { BalanceSuggestions } from "@/lib/hooks/battles";
import { XP_DIFFICULTIES } from "@/lib/utils/battle/balance/xp-budget";
import type { IdName } from "@/types/common";

interface AutopickCardProps {
  hasAllies: boolean;
  races: IdName[];
  balance: BalanceSuggestions;
}

export function AutopickCard({ hasAllies, races, balance }: AutopickCardProps) {
  const t = useTranslations("battleSetup.autopick");

  const tDifficulty = useTranslations("battleTerms.encounterDifficulty");

  const { isLoading, race, suggested, done, actions, xp } = balance;

  return (
    <HudSection title={t("title")} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {xp.enabled
          ? t("hintXp")
          : t("hintFair")}
      </p>
      {hasAllies ? (
        <>
          <div className="max-w-xs">
            <Label htmlFor="balanceRace">{t("race")}</Label>
            <SelectField
              id="balanceRace"
              className="mt-1"
              value={race}
              onValueChange={actions.setRace}
              allowNone
              noneLabel={t("anyRace")}
              options={races.map((r) => ({ value: r.id, label: r.name }))}
            />
          </div>
          {xp.enabled && (
            <HudChipTabs
              ariaLabel={t("difficulty")}
              items={XP_DIFFICULTIES[xp.edition].map((d) => ({ key: d, label: tDifficulty(d), active: xp.difficulty === d, onSelect: () => actions.setDifficulty(d) }))}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={actions.suggest} disabled={isLoading}>
              {isLoading ? t("suggesting") : t("suggest")}
            </Button>
            {suggested.length > 0 && (
              <Button type="button" variant="secondary" onClick={actions.apply}>
                {t("apply")}
              </Button>
            )}
          </div>
          {suggested.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-2 font-medium">{t("recommended")}</p>
              <ul className="space-y-1">
                {suggested.map((s) => (
                  <li key={s.unitId}>
                    {s.name} ×{s.quantity}
                    {s.hpMult != null && s.dmgMult != null && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t("scale", { hp: s.hpMult, dmg: s.dmgMult })}
                      </span>
                    )}
                    {s.xp !== undefined && <span className="ml-2 text-xs text-muted-foreground">XP {s.xp}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {done && suggested.length === 0 && <p className="text-sm text-muted-foreground">{t("noUnits")}</p>}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("needAllies")}</p>
      )}
    </HudSection>
  );
}
