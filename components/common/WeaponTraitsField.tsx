"use client";

import { useTranslations } from "next-intl";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEAPON_TRAIT_LABELS, WEAPON_TRAITS, type WeaponTrait } from "@/lib/constants/weapon-traits";

type TraitsValue = { traits?: WeaponTrait[]; versatileDice?: string };

interface WeaponTraitsFieldProps<T extends TraitsValue> {
  idPrefix: string;
  value: T;
  onChange: (next: T) => void;
}

export function WeaponTraitsField<T extends TraitsValue>({ idPrefix, value, onChange }: WeaponTraitsFieldProps<T>) {
  const t = useTranslations("common.weaponTraits");

  const traits = value.traits ?? [];

  const emit = (next: TraitsValue) => {
    const merged = { ...value, ...next };

    if (!next.traits) delete merged.traits;

    if (!next.versatileDice) delete merged.versatileDice;

    onChange(merged);
  };

  const toggle = (trait: WeaponTrait, on: boolean) => {
    const next = WEAPON_TRAITS.filter((t) => (t === trait ? on : traits.includes(t)));

    emit({ traits: next.length ? next : undefined, versatileDice: next.includes("versatile") ? value.versatileDice : undefined });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{t("label")}</Label>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {WEAPON_TRAITS.map((trait) => (
          <label key={trait} htmlFor={`${idPrefix}-trait-${trait}`} className="flex items-center gap-2 text-sm">
            <Checkbox id={`${idPrefix}-trait-${trait}`} checked={traits.includes(trait)} onCheckedChange={(v) => toggle(trait, v === true)} />
            {WEAPON_TRAIT_LABELS[trait]}
          </label>
        ))}
      </div>
      {traits.includes("versatile") && (
        <div className="max-w-40 space-y-1">
          <Label htmlFor={`${idPrefix}-versatileDice`} className="text-xs text-muted-foreground">
            {t("versatileDice")}
          </Label>
          <Input
            id={`${idPrefix}-versatileDice`}
            value={value.versatileDice ?? ""}
            placeholder="1d10"
            onChange={(e) => emit({ traits: value.traits, versatileDice: e.target.value || undefined })}
          />
        </div>
      )}
    </div>
  );
}
