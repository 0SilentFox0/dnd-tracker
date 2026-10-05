"use client";

import { useState } from "react";

import { AbilityCopySourcePicker } from "./AbilityCopySourcePicker";
import { useAbilityEditor } from "./editor-context";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { Ability } from "@/lib/utils/abilities/schema";
import { ABILITY_TEMPLATES } from "@/lib/utils/abilities/templates";

interface AbilityTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (abilities: Ability[]) => void;
}

export function AbilityTemplatePicker({ open, onOpenChange, onPick }: AbilityTemplatePickerProps) {
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
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      title={<>{copying ? "Скопіювати вміння з…" : "Додати вміння"}</>}
    >
        {copying ? (
          <AbilityCopySourcePicker campaignId={campaignId} onPick={pick} />
        ) : (
          <div className="space-y-2">
            {ABILITY_TEMPLATES.map((t) => (
              <Button key={t.id} type="button" variant="outline" className="h-auto w-full flex-col items-start py-2" onClick={() => pick([{ id: "", ...t.build() }])}>
                <span className="font-medium">{t.label}</span>
                <span className="text-xs font-normal text-muted-foreground">{t.hint}</span>
              </Button>
            ))}
            <Button type="button" variant="secondary" className="w-full" onClick={() => setCopying(true)}>
              Скопіювати з…
            </Button>
          </div>
        )}
    </ResponsiveDialog>
  );
}
