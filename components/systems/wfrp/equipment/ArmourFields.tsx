"use client";

import { useTranslations } from "next-intl";

import { NumberField } from "./NumberField";
import { QualityListEditor } from "./QualityListEditor";

import { FormField } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import type { HitLocation, WfrpArmourStats } from "@/lib/utils/rules/systems";
import { AP_MAX_PER_LAYER, ARMOUR_KINDS } from "@/lib/utils/rules/systems/wfrp/equipment";

const LOCATIONS: HitLocation[] = ["head", "arm", "body", "leg"];

interface ArmourFieldsProps {
  value: WfrpArmourStats;
  onChange: (next: WfrpArmourStats) => void;
}

export function ArmourFields({ value, onChange }: ArmourFieldsProps) {
  const t = useTranslations("wfrpEquipmentEditor.editor");

  const tl = useTranslations("wfrpEquipment.locations");

  const tk = useTranslations("wfrpEquipmentEditor.armourKinds");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {LOCATIONS.map((l) => (
          <NumberField key={l} id={`wfrp-ap-${l}`} label={t("ap", { location: tl(l) })} value={value.locations[l]} max={AP_MAX_PER_LAYER} onChange={(n) => onChange({ ...value, locations: { ...value.locations, [l]: n ?? 0 } })} />
        ))}
      </div>
      <FormField label={t("armourKind")} htmlFor="wfrp-armour-kind">
        <SelectField id="wfrp-armour-kind" value={value.kind} onValueChange={(kind) => onChange({ ...value, kind: kind as WfrpArmourStats["kind"] })} options={ARMOUR_KINDS.map((k) => ({ value: k, label: tk(k) }))} triggerClassName="min-h-11 w-full" />
      </FormField>
      <QualityListEditor id="wfrp-armour-q" label={t("qualities")} kind="quality" value={value.qualities} onChange={(qualities) => onChange({ ...value, qualities })} />
    </div>
  );
}
