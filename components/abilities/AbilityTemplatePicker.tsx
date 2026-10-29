"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { AbilityCopySourcePicker } from "./AbilityCopySourcePicker";
import { useAbilityEditor } from "./editor-context";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { Ability } from "@/lib/utils/abilities/schema";
import { ABILITY_TEMPLATES } from "@/lib/utils/abilities/templates";

interface AbilityTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (abilities: Ability[]) => void;
}

export function AbilityTemplatePicker({ open, onOpenChange, onPick }: AbilityTemplatePickerProps) {
  const t = useTranslations("abilities.templates");

  const tr = useTranslator("abilityRegistry");

  const { campaignId } = useAbilityEditor();

  const [copying, setCopying] = useState(false);

  const close = () => {
    setCopying(false);
    onOpenChange(false);
  };

  const pick = (abilities: Ability[]) => {
    onPick(abilities);
    close();
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      title={copying ? t("copyTitle") : t("addTitle")}
    >
        {copying ? (
          <AbilityCopySourcePicker campaignId={campaignId} onPick={pick} />
        ) : (
          <div className="space-y-2">
            {ABILITY_TEMPLATES.map((template) => (
              <Button key={template.id} type="button" variant="outline" className="h-auto w-full flex-col items-start py-2" onClick={() => pick([{ id: "", ...template.build({ name: tr(`templates.${template.id}.defaultName`), note: tr("templates.custom.note") }) }])}>
                <span className="font-medium">{tr(`templates.${template.id}.label`)}</span>
                <span className="text-xs font-normal text-muted-foreground">{tr(`templates.${template.id}.hint`)}</span>
              </Button>
            ))}
            <Button type="button" variant="secondary" className="w-full" onClick={() => setCopying(true)}>
              {t("copyFrom")}
            </Button>
          </div>
        )}
    </ResponsiveDialog>
  );
}
