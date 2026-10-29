"use client";

import type { Dispatch, SetStateAction } from "react";
import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BattleDetails {
  name: string;
  description: string;
}

export function BattleFormBasicInfo({ details }: { details: { data: BattleDetails; set: Dispatch<SetStateAction<BattleDetails>> } }) {
  const t = useTranslations("battleSetup.basic");

  const { data, set } = details;

  return (
    <HudSection title={t("title")} className="space-y-4">
      <div>
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" value={data.name} onChange={(e) => set((prev) => ({ ...prev, name: e.target.value }))} required placeholder={t("namePlaceholder")} />
      </div>
      <div>
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => set((prev) => ({ ...prev, description: e.target.value }))}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
        />
      </div>
    </HudSection>
  );
}
