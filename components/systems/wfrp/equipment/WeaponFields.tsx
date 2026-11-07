"use client";

import { useTranslations } from "next-intl";

import { NumberField } from "./NumberField";
import { QualityListEditor } from "./QualityListEditor";

import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import type { WfrpWeaponStats } from "@/lib/utils/rules/systems";
import { WEAPON_GROUPS, WEAPON_REACHES } from "@/lib/utils/rules/systems/wfrp/equipment";

interface WeaponFieldsProps {
  value: WfrpWeaponStats;
  onChange: (next: WfrpWeaponStats) => void;
}

const withoutRange = ({ range: _range, ...rest }: WfrpWeaponStats): WfrpWeaponStats => rest;

const withoutReach = ({ reach: _reach, ...rest }: WfrpWeaponStats): WfrpWeaponStats => rest;

export function WeaponFields({ value, onChange }: WeaponFieldsProps) {
  const t = useTranslations("wfrpEquipmentEditor.editor");

  const tg = useTranslations("wfrpEquipmentEditor.groups");

  const tr = useTranslations("wfrpEquipmentEditor.reaches");

  const ranged = value.range !== undefined;

  const setAmmo = (n: number | undefined) => {
    const { ammoCapacity: _ammo, ...rest } = value;

    onChange(n ? { ...rest, ammoCapacity: n } : rest);
  };

  return (
    <div className="space-y-4">
      <FormField label={t("group")} htmlFor="wfrp-weapon-group">
        <SelectField id="wfrp-weapon-group" value={value.group} onValueChange={(group) => onChange({ ...value, group: group as WfrpWeaponStats["group"] })} options={WEAPON_GROUPS.map((g) => ({ value: g, label: tg(g) }))} triggerClassName="min-h-11 w-full" />
      </FormField>
      <FormField label={t("attackKind")} htmlFor="wfrp-weapon-kind">
        <SelectField
          id="wfrp-weapon-kind"
          value={ranged ? "ranged" : "melee"}
          onValueChange={(k) => onChange(k === "ranged" ? { ...withoutReach(value), range: 30 } : { ...withoutRange(value), reach: "average" })}
          options={[
            { value: "melee", label: t("melee") },
            { value: "ranged", label: t("ranged") },
          ]}
          triggerClassName="min-h-11 w-full"
        />
      </FormField>
      {ranged ? (
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="wfrp-weapon-range" label={t("range")} value={value.range} min={1} onChange={(n) => onChange({ ...value, range: n ?? 0 })} />
          <NumberField id="wfrp-weapon-ammo" label={t("ammo")} value={value.ammoCapacity} onChange={setAmmo} />
        </div>
      ) : (
        <FormField label={t("reach")} htmlFor="wfrp-weapon-reach">
          <SelectField id="wfrp-weapon-reach" value={value.reach ?? "average"} onValueChange={(reach) => onChange({ ...value, reach: reach as WfrpWeaponStats["reach"] })} options={WEAPON_REACHES.map((r) => ({ value: r, label: tr(r) }))} triggerClassName="min-h-11 w-full" />
        </FormField>
      )}
      <NumberField id="wfrp-weapon-damage" label={t("damageFlat")} value={value.damage.flat} min={-100} max={100} onChange={(n) => onChange({ ...value, damage: { ...value.damage, flat: n ?? 0 } })} />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Checkbox checked={value.damage.addSb} onCheckedChange={(c) => onChange({ ...value, damage: { ...value.damage, addSb: c === true } })} />
        {t("addSb")}
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <Checkbox checked={value.twoHanded} onCheckedChange={(c) => onChange({ ...value, twoHanded: c === true })} />
        {t("twoHanded")}
      </label>
      <QualityListEditor id="wfrp-weapon-q" label={t("qualities")} kind="quality" value={value.qualities} onChange={(qualities) => onChange({ ...value, qualities })} />
      <QualityListEditor id="wfrp-weapon-f" label={t("flaws")} kind="flaw" value={value.flaws} onChange={(flaws) => onChange({ ...value, flaws })} />
    </div>
  );
}
