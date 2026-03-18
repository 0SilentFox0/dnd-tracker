"use client";

import type { SpellFormData } from "./spell-form-defaults";
import {
  CASTING_TIME_OPTIONS,
  SPELL_DAMAGE_TYPE_OPTIONS,
  SPELL_LEVEL_OPTIONS,
  SPELL_TYPE_OPTIONS,
} from "./spell-form-defaults";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { DICE_OPTIONS } from "@/lib/constants/dice";
import {
  DAMAGE_MODIFIER_OPTIONS,
  HEAL_MODIFIER_OPTIONS,
  SPELL_TARGET_OPTIONS,
} from "@/lib/constants/spells";

export interface SpellFormBasicFieldsProps {
  formData: SpellFormData;
  setFormData: (data: SpellFormData | ((prev: SpellFormData) => SpellFormData)) => void;
  spellGroups: { id: string; name: string }[];
}

export function SpellFormBasicFields({
  formData,
  setFormData,
  spellGroups,
}: SpellFormBasicFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <LabeledInput
        id="name"
        label="Назва заклинання"
        value={formData.name || ""}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        placeholder="Назва заклинання"
      />
      <div>
        <Label htmlFor="level">Рівень *</Label>
        <SelectField
          id="level"
          value={formData.level?.toString() || "0"}
          onValueChange={(value) =>
            setFormData({ ...formData, level: parseInt(value) })
          }
          placeholder="Виберіть рівень"
          options={SPELL_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>
      <div>
        <Label htmlFor="groupId">Група заклинань</Label>
        <SelectField
          id="groupId"
          value={formData.groupId || ""}
          onValueChange={(value) =>
            setFormData({ ...formData, groupId: value || null })
          }
          placeholder="Виберіть групу"
          options={spellGroups.map((g) => ({ value: g.id, label: g.name }))}
          allowNone
          noneLabel="Без групи"
        />
      </div>
      <div>
        <Label htmlFor="type">Тип *</Label>
        <SelectField
          id="type"
          value={formData.type || "target"}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              type: value as "target" | "aoe" | "no_target",
            })
          }
          placeholder="Виберіть тип"
          options={SPELL_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>
      <div>
        <Label htmlFor="target">Ціль</Label>
        <SelectField
          id="target"
          value={formData.target || ""}
          onValueChange={(value) =>
            setFormData({ ...formData, target: value || null })
          }
          placeholder="Виберіть ціль"
          options={SPELL_TARGET_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          allowNone
          noneLabel="Не вказано"
        />
      </div>
      <div>
        <Label htmlFor="damageType">Тип шкоди/ефекту *</Label>
        <SelectField
          id="damageType"
          value={formData.damageType || "damage"}
          onValueChange={(value: string) => {
            const newValue = value as
              | "damage"
              | "heal"
              | "all"
              | "buff"
              | "debuff";

            setFormData({
              ...formData,
              damageType: newValue,
              damageModifier:
                newValue === "damage" || newValue === "all"
                  ? formData.damageModifier
                  : null,
              healModifier: newValue === "heal" ? formData.healModifier : null,
            });
          }}
          placeholder="Виберіть тип"
          options={SPELL_DAMAGE_TYPE_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
      </div>

      {(formData.damageType === "damage" || formData.damageType === "all") && (
        <>
          <div>
            <Label>Елемент шкоди</Label>
            <SelectField
              value={formData.damageElement || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, damageElement: value || null })
              }
              placeholder="Без елементу"
              options={DAMAGE_ELEMENT_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              allowNone
              noneLabel="Без елементу"
            />
          </div>
          <div>
            <Label>Модифікатор шкоди</Label>
            <SelectField
              value={formData.damageModifier || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, damageModifier: value || null })
              }
              placeholder="Без модифікатора"
              options={DAMAGE_MODIFIER_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              allowNone
              noneLabel="Без модифікатора"
            />
          </div>
        </>
      )}

      {formData.damageType === "heal" && (
        <div>
          <Label>Модифікатор лікування</Label>
          <SelectField
            value={formData.healModifier || ""}
            onValueChange={(value) =>
              setFormData({ ...formData, healModifier: value || null })
            }
            placeholder="Без модифікатора"
            options={HEAL_MODIFIER_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            allowNone
            noneLabel="Без модифікатора"
          />
        </div>
      )}

      <div>
        <Label htmlFor="castingTime">Час створення</Label>
        <SelectField
          id="castingTime"
          value={formData.castingTime || ""}
          onValueChange={(value) =>
            setFormData({ ...formData, castingTime: value || null })
          }
          placeholder="Виберіть"
          options={CASTING_TIME_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          allowNone
          noneLabel="Не вказано"
        />
      </div>
      <div>
        <Label htmlFor="range">Дальність</Label>
        <Input
          id="range"
          value={formData.range || ""}
          onChange={(e) =>
            setFormData({ ...formData, range: e.target.value })
          }
          placeholder="60 feet"
        />
      </div>
      <div>
        <Label htmlFor="duration">Тривалість</Label>
        <Input
          id="duration"
          value={formData.duration || ""}
          onChange={(e) =>
            setFormData({ ...formData, duration: e.target.value })
          }
          placeholder="Instantaneous"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="dice">
          {formData.damageType === "heal"
            ? "Кубики лікування"
            : "Кубики шкоди"}
        </Label>
        <div className="flex gap-2">
          <Input
            id="diceCount"
            type="number"
            min={0}
            max={10}
            value={formData.diceCount ?? ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                diceCount:
                  e.target.value === ""
                    ? null
                    : parseInt(e.target.value) || 0,
              })
            }
            placeholder="0"
            className="w-20"
          />
          <SelectField
            value={formData.diceType || ""}
            onValueChange={(value) =>
              setFormData({ ...formData, diceType: value || null })
            }
            placeholder="Тип кубика"
            options={DICE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            allowNone
            noneLabel="Без кубиків"
            triggerClassName="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
