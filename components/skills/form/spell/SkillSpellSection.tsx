"use client";

import { useTranslations } from "next-intl";

import { SkillSpellSelector } from "./SkillSpellSelector";

import { HudSection } from "@/components/hud/form";
import type { IdName } from "@/types/common";
import type { SkillFormBinding } from "@/types/skills";

export function SkillSpellSection({ form, spells }: { form: SkillFormBinding; spells: IdName[] }) {
  const t = useTranslations("skills.form.spell");

  const { data, set } = form;

  return (
    <HudSection title={t("title")}>
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SkillSpellSelector spellId={data.spellId} spells={spells} onSpellIdChange={(id) => set("spellId", id)} label={t("related")} placeholder={t("notSelected")} noneLabel={t("notSelected")} />
          <SkillSpellSelector id="skill-granted-spell" spellId={data.grantedSpellId} spells={spells} onSpellIdChange={(id) => set("grantedSpellId", id)} label={t("granted")} placeholder={t("grantedNone")} noneLabel={t("grantedNone")} />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("hint")}
        </p>
      </div>
    </HudSection>
  );
}
