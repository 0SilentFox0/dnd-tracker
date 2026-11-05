"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { skillName, specName } from "../skill-label";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { SPEC_RE } from "@/lib/utils/rules/systems";
import { SKILL_CATALOG, skillAdvanceKey, skillDef } from "@/lib/utils/rules/systems/wfrp/skills/catalog";

interface Props {
  cost: (advanceKey: string) => number | null;
  available: number;
  pending: boolean;
  onBuy: (advanceKey: string) => void;
}

export function NewSkillPicker({ cost, available, pending, onBuy }: Props) {
  const t = useTranslations("wfrpAdvancement.ui");

  const tg = useTranslations("gameTerms");

  const [skill, setSkill] = useState("");

  const [spec, setSpec] = useState("");

  const def = skillDef(skill);

  const specValue = spec.trim().toLowerCase();

  const specOk = def?.spec === "none" || (def?.spec === "fixed" && !!def.specs?.includes(specValue)) || (def?.spec === "open" && SPEC_RE.test(specValue));

  const advanceKey = def && specOk ? skillAdvanceKey(def.key, def.spec === "none" ? undefined : specValue) : null;

  const price = advanceKey ? cost(advanceKey) : null;

  const options = SKILL_CATALOG.filter((s) => s.kind === "advanced").map((s) => ({ value: s.key, label: skillName(tg, s.key) }));

  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <SelectField aria-label={t("newSkill")} value={skill} onValueChange={(v) => { setSkill(v); setSpec(""); }} options={options} placeholder={t("newSkill")} triggerClassName="min-h-11 w-full" />
      {def?.spec === "fixed" && <SelectField aria-label={t("spec")} value={spec} onValueChange={setSpec} options={(def.specs ?? []).map((s) => ({ value: s, label: specName(tg, def.key, s) }))} placeholder={t("spec")} triggerClassName="min-h-11 w-full" />}
      {def?.spec === "open" && <Input className="min-h-11" aria-label={t("spec")} placeholder={t("spec")} value={spec} onChange={(e) => setSpec(e.target.value)} />}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-11"
        disabled={!advanceKey || price === null || price > available || pending}
        onClick={() => {
          if (!advanceKey) return;

          onBuy(advanceKey);
          setSkill("");
          setSpec("");
        }}
      >
        {price === null ? t("buyNew") : t("buy", { cost: price })}
      </Button>
    </div>
  );
}
