"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { skillLabel } from "../skill-label";
import { CareerSkillPicker } from "./CareerSkillPicker";

import { Button } from "@/components/ui/button";
import { CommaListInput } from "@/components/ui/comma-list-input";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { CHARACTERISTIC_KEYS, type CharacteristicKey } from "@/systems/wfrp/rules/characteristics/keys";
import { parseSkillAdvanceKey } from "@/systems/wfrp/rules/skills/catalog";
import type { CareerTierDef } from "@/types/careers";
import type { FeatData } from "@/types/choices";

interface Props {
  index: number;
  tier: CareerTierDef;
  feats: FeatData[];
  onChange: (patch: Partial<CareerTierDef>) => void;
}

function Chip({ label, removeLabel, onRemove }: { label: string; removeLabel: string; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-1 rounded border border-hud-line py-0.5 pl-2 text-xs">
      {label}
      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={removeLabel} onClick={onRemove}>
        <X className="size-3" />
      </Button>
    </li>
  );
}

export function CareerTierFields({ index, tier, feats, onChange }: Props) {
  const t = useTranslations("wfrpCareers.form");

  const tc = useTranslations("gameTerms.characteristics");

  const tg = useTranslations("gameTerms");

  const toggle = (key: CharacteristicKey) => onChange({ characteristics: tier.characteristics.includes(key) ? tier.characteristics.filter((k) => k !== key) : [...tier.characteristics, key] });

  const featName = (id: string) => feats.find((f) => f.id === id)?.name ?? id;

  return (
    <fieldset className="space-y-3 rounded border border-hud-line p-3">
      <legend className="hud-sc px-1 text-sm text-hud-gold">{t("tier", { n: index + 1 })}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("tierName")} htmlFor={`career-tier-${index}-name`} required>
          <Input id={`career-tier-${index}-name`} className="min-h-11" value={tier.name} onChange={(e) => onChange({ name: e.target.value })} />
        </FormField>
        <FormField label={t("status")} htmlFor={`career-tier-${index}-status`}>
          <Input id={`career-tier-${index}-status`} className="min-h-11" value={tier.status ?? ""} onChange={(e) => onChange({ status: e.target.value })} />
        </FormField>
      </div>
      <div>
        <p className="mb-1 text-xs text-hud-muted">{t("characteristics")}</p>
        <div className="flex flex-wrap gap-1">
          {CHARACTERISTIC_KEYS.map((key) => (
            <Button key={key} type="button" size="sm" variant={tier.characteristics.includes(key) ? "default" : "outline"} className="min-h-11 min-w-11" aria-pressed={tier.characteristics.includes(key)} onClick={() => toggle(key)}>
              {tc(`${key}.label`)}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-hud-muted">{t("skills")}</p>
        <ul className="flex flex-wrap gap-1">
          {tier.skills.map((key) => {
            const { key: skill, spec } = parseSkillAdvanceKey(key);

            const label = skillLabel(tg, skill, spec);

            return <Chip key={key} label={label} removeLabel={t("remove", { name: label })} onRemove={() => onChange({ skills: tier.skills.filter((k) => k !== key) })} />;
          })}
        </ul>
        <CareerSkillPicker onAdd={(key) => !tier.skills.includes(key) && onChange({ skills: [...tier.skills, key] })} />
      </div>
      <div className="space-y-2">
        <p className="text-xs text-hud-muted">{t("talents")}</p>
        <ul className="flex flex-wrap gap-1">
          {tier.talents.map((id) => (
            <Chip key={id} label={featName(id)} removeLabel={t("remove", { name: featName(id) })} onRemove={() => onChange({ talents: tier.talents.filter((k) => k !== id) })} />
          ))}
        </ul>
        <SelectField
          aria-label={t("talent")}
          value=""
          onValueChange={(id) => !tier.talents.includes(id) && onChange({ talents: [...tier.talents, id] })}
          options={feats.filter((f) => !tier.talents.includes(f.id)).map((f) => ({ value: f.id, label: f.name }))}
          placeholder={t("talent")}
          triggerClassName="min-h-11 w-full"
        />
      </div>
      <FormField label={t("trappings")} htmlFor={`career-tier-${index}-trappings`}>
        <CommaListInput id={`career-tier-${index}-trappings`} className="min-h-11" value={tier.trappings} onChange={(trappings) => onChange({ trappings })} />
      </FormField>
    </fieldset>
  );
}
