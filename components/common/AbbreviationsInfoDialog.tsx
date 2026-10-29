"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { CORE_ABILITY_SCORES, STAT_SCORES } from "@/lib/constants/abilities";

export function AbbreviationsInfoDialog() {
  const t = useTranslations("gameTerms.abbreviations");

  const tAbility = useTranslations("gameTerms.abilities");

  const tStat = useTranslations("gameTerms.stats");

  const [open, setOpen] = useState(false);

  const mainAbilities = CORE_ABILITY_SCORES;

  return (
    <>
      <Button onClick={() => setOpen(true)}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-hud-gold hover:bg-transparent hover:text-hud-gold-strong"
          title={t("title")}
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">{t("srOnly")}</span>
        </Button>
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title={t("title")}
      description={t("description")}
      size="sm"
      hud
    >
        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-semibold mb-2 text-sm">{t("main")}</h3>
            <div className="space-y-2">
              {mainAbilities.map((ability) => (
                <div
                  key={ability.key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{ability.abbreviation}</span>
                  <span className="text-muted-foreground">{tAbility(`${ability.key}.label`)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t">
            <h3 className="font-semibold mb-2 text-sm">{t("other")}</h3>
            <div className="space-y-2">
              {STAT_SCORES.map((ability) => (
                <div
                  key={ability.key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{ability.abbreviation}</span>
                  <span className="text-muted-foreground">{tStat(ability.key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
    </ResponsiveDialog>
    </>
  );
}
