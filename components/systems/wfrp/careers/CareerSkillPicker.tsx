"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { skillName, specName } from "../skill-label";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { SPEC_RE } from "@/lib/utils/rules/systems";
import { SKILL_CATALOG, skillAdvanceKey, skillDef } from "@/lib/utils/rules/systems/wfrp/skills/catalog";

const OPTIONS_ALL = SKILL_CATALOG.map((s) => s.key);

export function CareerSkillPicker({ onAdd }: { onAdd: (advanceKey: string) => void }) {
  const t = useTranslations("wfrpCareers.form");

  const tg = useTranslations("gameTerms");

  const [skill, setSkill] = useState("");

  const [spec, setSpec] = useState("");

  const def = skillDef(skill);

  const specValue = spec.trim().toLowerCase();

  const specOk = !specValue || (def?.spec === "fixed" && !!def.specs?.includes(specValue)) || (def?.spec === "open" && SPEC_RE.test(specValue));

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <SelectField aria-label={t("skill")} value={skill} onValueChange={(v) => { setSkill(v); setSpec(""); }} options={OPTIONS_ALL.map((key) => ({ value: key, label: skillName(tg, key) }))} placeholder={t("skill")} triggerClassName="min-h-11 w-full" />
      {def?.spec === "fixed" && <SelectField aria-label={t("spec")} value={spec} onValueChange={setSpec} options={(def.specs ?? []).map((s) => ({ value: s, label: specName(tg, def.key, s) }))} placeholder={t("anySpec")} triggerClassName="min-h-11 w-full" />}
      {def?.spec === "open" && <Input className="min-h-11" aria-label={t("spec")} placeholder={t("anySpec")} value={spec} onChange={(e) => setSpec(e.target.value)} />}
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={!def || !specOk}
        onClick={() => {
          if (!def) return;

          onAdd(skillAdvanceKey(def.key, specValue || undefined));
          setSkill("");
          setSpec("");
        }}
      >
        {t("add")}
      </Button>
    </div>
  );
}
