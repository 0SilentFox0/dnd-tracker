"use client";

import { useTranslations } from "next-intl";

import { WeaponTraitsField } from "@/components/common/WeaponTraitsField";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { AttackType } from "@/lib/constants/battle";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { UnitAttack as UnitAttackValue } from "@/types/units";

// "фт" in user-entered ranges
const FIVE_FEET = /^5\s*(\u0444\u0442|ft)/i;

interface UnitAttackProps {
  attack: UnitAttackValue;
  index: number;
  onChange: (attack: UnitAttackValue) => void;
  onRemove: () => void;
}

export function UnitAttack({
  attack,
  index,
  onChange,
  onRemove,
}: UnitAttackProps) {
  const t = useTranslations("units.attacks");

  const tDamage = useTranslations("gameTerms.damageTypes");

  const tCommon = useTranslations("common.actions");

  return (
    <HudPanel as="div" className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium">{t("heading", { number: index + 1 })}</Label>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            {tCommon("delete")}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <LabeledInput
            id={`attack-name-${index}`}
            label={t("name")}
            value={attack.name}
            onChange={(e) => onChange({ ...attack, name: e.target.value })}
            placeholder={t("namePlaceholder")}
          />
          <div>
            <Label htmlFor={`attack-type-${index}`}>{t("kind")}</Label>
            <SelectField
              id={`attack-type-${index}`}
              value={attack.type ?? (attack.range && !FIVE_FEET.test(attack.range) ? AttackType.RANGED : AttackType.MELEE)}
              onValueChange={(value) =>
                onChange({
                  ...attack,
                  type: attackKindOf(value),
                })
              }
              placeholder={t("kindPlaceholder")}
              options={[
                { value: AttackType.MELEE, label: t("kinds.melee") },
                { value: AttackType.RANGED, label: t("kinds.ranged") },
              ]}
            />
          </div>
          <LabeledInput
            id={`attack-damage-dice-${index}`}
            label={t("dice")}
            value={attack.damageDice}
            onChange={(e) => onChange({ ...attack, damageDice: e.target.value })}
            placeholder="1d6, 2d8+3"
          />
          <div>
            <Label htmlFor={`attack-damage-type-${index}`}>{t("damageType")}</Label>
            <SelectField
              id={`attack-damage-type-${index}`}
              value={attack.damageType || "bludgeoning"}
              onValueChange={(value) =>
                onChange({ ...attack, damageType: value || "bludgeoning" })
              }
              placeholder={t("damageTypePlaceholder")}
              options={DAMAGE_ELEMENT_OPTIONS.map((opt) => ({
                value: opt.value,
                label: tDamage(opt.value),
              }))}
            />
          </div>
          <LabeledInput
            id={`attack-range-${index}`}
            label={t("range")}
            value={attack.range || ""}
            onChange={(e) => onChange({ ...attack, range: e.target.value })}
            placeholder={t("rangePlaceholder")}
          />
          <LabeledInput
            id={`attack-properties-${index}`}
            label={t("properties")}
            value={attack.properties || ""}
            onChange={(e) => onChange({ ...attack, properties: e.target.value })}
            placeholder={t("propertiesPlaceholder")}
          />
          <div>
            <Label htmlFor={`attack-target-type-${index}`}>{t("target")}</Label>
            <SelectField
              id={`attack-target-type-${index}`}
              value={attack.targetType ?? "target"}
              onValueChange={(value) =>
                onChange({
                  ...attack,
                  targetType: (value === "aoe" ? "aoe" : "target") as "target" | "aoe",
                })
              }
              options={[
                { value: "target", label: t("targets.target") },
                { value: "aoe", label: t("targets.aoe") },
              ]}
            />
          </div>
        </div>
        <WeaponTraitsField
          idPrefix={`attack-${index}`}
          value={attack}
          onChange={onChange}
        />
        <div className="grid grid-cols-3 items-end gap-2">
          <LabeledInput
            id={`attack-bonus-${index}`}
            label={t("bonus")}
            labelClassName="text-xs leading-tight"
            type="number"
            value={attack.attackBonus}
            onChange={(e) =>
              onChange({
                ...attack,
                attackBonus: parseInt(e.target.value, 10) || 0,
              })
            }
          />
          <LabeledInput
            id={`attack-guaranteed-${index}`}
            label={t("guaranteed")}
            labelClassName="text-xs leading-tight"
            type="number"
            min={0}
            value={attack.guaranteedDamage ?? ""}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);

              onChange({
                ...attack,
                guaranteedDamage: e.target.value === "" ? undefined : Math.max(0, v),
              });
            }}
            placeholder={t("guaranteedPlaceholder")}
          />
          {attack.targetType === "aoe" && (
            <LabeledInput
              id={`attack-max-targets-${index}`}
              label={t("maxTargets")}
              labelClassName="text-xs leading-tight"
              type="number"
              min={1}
              max={20}
              value={attack.maxTargets ?? 3}
              onChange={(e) =>
                onChange({
                  ...attack,
                  maxTargets: Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)),
                })
              }
            />
          )}
        </div>
        {attack.targetType === "aoe" && (
          <div className="space-y-2">
            <Label>{t("distribution")}</Label>
            <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4">
              {Array.from({ length: attack.maxTargets ?? 3 }).map((_, i) => (
                <LabeledInput
                  key={i}
                  id={`attack-damage-dist-${index}-${i}`}
                  label={t("targetN", { number: i + 1 })}
                  labelClassName="text-xs leading-tight"
                  type="number"
                  min={0}
                  max={100}
                  value={
                    attack.damageDistribution?.[i] ??
                    Math.round(100 / (attack.maxTargets ?? 3))
                  }
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));

                    const count = attack.maxTargets ?? 3;

                    const next = Array.from({ length: count }, (_, k) => attack.damageDistribution?.[k] ?? Math.round(100 / count));

                    next[i] = val;
                    onChange({ ...attack, damageDistribution: next });
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("distributionHint")}
            </p>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
