"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ColorField } from "@/components/common/ColorField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SPELL_GROUP_FALLBACK_COLOR, SPELL_GROUP_ICON_KEYS } from "@/lib/constants/spell-groups";
import { useNotify } from "@/lib/hooks/common";
import { useUpdateSpellGroup } from "@/lib/hooks/spells";
import { cn } from "@/lib/utils";
import { getSpellGroupIcon } from "@/lib/utils/spells/spell-icons";
import type { SpellGroup } from "@/types/spells";

interface SpellGroupDialogProps {
  campaignId: string;
  group: SpellGroup;
  onOpenChange: (open: boolean) => void;
}

export function SpellGroupDialog({ campaignId, group, onOpenChange }: SpellGroupDialogProps) {
  const t = useTranslations("spells.groupDialog");

  const ta = useTranslations("common.actions");

  const notify = useNotify();

  const update = useUpdateSpellGroup(campaignId);

  const [name, setName] = useState(group.name);

  const [color, setColor] = useState(group.color ?? SPELL_GROUP_FALLBACK_COLOR);

  const [icon, setIcon] = useState(group.icon ?? null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await update.mutateAsync({ groupId: group.id, name: name.trim(), color, icon });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating spell group:", error);
      void notify(error instanceof Error ? error.message : t("saveFailed"));
    }
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      size="sm"
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {ta("cancel")}
          </Button>
          <Button type="submit" form="spell-group-form" disabled={update.isPending || !name.trim()}>
            {update.isPending ? ta("saving") : ta("save")}
          </Button>
        </>
      }
    >
      <form id="spell-group-form" onSubmit={submit} className="space-y-4">
        <FormField label={t("name")} htmlFor="spell-group-name" required>
          <Input id="spell-group-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>
        <ColorField id="spell-group-color" label={t("color")} value={color} onChange={setColor} />
        <FormField label={t("icon")} htmlFor="spell-group-icon">
          <div className="flex gap-2">
            {SPELL_GROUP_ICON_KEYS.map((key) => {
              const Icon = getSpellGroupIcon({ icon: key });

              return (
                <Button key={key} type="button" variant="outline" size="icon" aria-label={key} aria-pressed={icon === key} className={cn(icon === key && "border-primary bg-primary/20")} onClick={() => setIcon(key)}>
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </FormField>
      </form>
    </ResponsiveDialog>
  );
}
