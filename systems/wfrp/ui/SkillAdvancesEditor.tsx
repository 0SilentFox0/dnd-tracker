"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { skillLabel, skillName, specName } from "./skill-label";

import { BoundedNumberInput } from "@/components/ui/bounded-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { SectionBinding } from "@/lib/utils/characters/form/bindings";
import type { Characteristics } from "@/lib/utils/rules/systems";
import { SPEC_RE } from "@/lib/utils/rules/systems";
import { parseSkillAdvanceKey, SKILL_CATALOG, skillAdvanceKey, skillDef } from "@/systems/wfrp/rules/skills/catalog";

export function SkillAdvancesEditor({ binding: { data, set } }: { binding: SectionBinding<Characteristics> }) {
  const t = useTranslations("characters.wfrp");

  const tg = useTranslations("gameTerms");

  const [query, setQuery] = useState("");

  const [skill, setSkill] = useState("");

  const [spec, setSpec] = useState("");

  const needle = query.trim().toLowerCase();

  const options = SKILL_CATALOG.filter((s) => !needle || skillName(tg, s.key).toLowerCase().includes(needle) || s.key.includes(needle)).map((s) => ({ value: s.key, label: skillName(tg, s.key) }));

  const def = skillDef(skill);

  const specValue = spec.trim().toLowerCase();

  const specOk = def?.spec === "none" || (def?.spec === "fixed" && !!def.specs?.includes(specValue)) || (def?.spec === "open" && SPEC_RE.test(specValue));

  const entries = Object.entries(data.skillAdvances);

  const add = () => {
    if (!def || !specOk) return;

    const key = skillAdvanceKey(def.key, def.spec === "none" ? undefined : specValue);

    set("skillAdvances", { ...data.skillAdvances, [key]: data.skillAdvances[key] ?? 1 });
    setSkill("");
    setSpec("");
  };

  const setAdvances = (key: string, value: number) => set("skillAdvances", { ...data.skillAdvances, [key]: value });

  const remove = (key: string) => set("skillAdvances", Object.fromEntries(entries.filter(([k]) => k !== key)));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Input aria-label={t("skillSearch")} placeholder={t("skillSearch")} value={query} onChange={(e) => setQuery(e.target.value)} />
        <SelectField aria-label={t("skill")} value={skill} onValueChange={(v) => { setSkill(v); setSpec(""); }} options={options} placeholder={t("skill")} triggerClassName="w-full" />
        {def?.spec === "fixed" && <SelectField aria-label={t("spec")} value={spec} onValueChange={setSpec} options={(def.specs ?? []).map((s) => ({ value: s, label: specName(tg, def.key, s) }))} placeholder={t("spec")} triggerClassName="w-full" />}
        {def?.spec === "open" && <Input aria-label={t("spec")} placeholder={t("spec")} value={spec} onChange={(e) => setSpec(e.target.value)} />}
        <Button type="button" variant="outline" disabled={!def || !specOk} onClick={add}>
          {t("addSkill")}
        </Button>
      </div>
      {entries.length === 0 && <p className="text-xs text-hud-muted">{t("noSkillAdvances")}</p>}
      <ul className="space-y-1">
        {entries.map(([key, value]) => {
          const { key: skillKey, spec: skillSpec } = parseSkillAdvanceKey(key);

          const label = skillDef(skillKey) ? skillLabel(tg, skillKey, skillSpec) : key;

          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <BoundedNumberInput aria-label={`${label}: ${t("advances")}`} className="w-20" min={0} max={100} value={value} onCommit={(v) => setAdvances(key, v)} />
              <Button type="button" variant="ghost" size="icon" aria-label={t("removeSkill", { name: label })} onClick={() => remove(key)}>
                <X className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
