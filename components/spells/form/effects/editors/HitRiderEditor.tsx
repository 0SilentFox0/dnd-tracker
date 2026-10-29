"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";
import { SpellOnlyField } from "../SpellOnlyField";

import { EffectListEditor } from "@/components/spells/form/effects/EffectListEditor";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { useTranslator } from "@/lib/i18n/use-translator";

export function HitRiderEditor({ effect, path, onChange }: SpellOnlyEditorProps<"hitRider">) {
  const t = useTranslator("editors");

  const tc = useTranslator();

  const { save } = effect;

  const owner = { kind: "hitRider", effect, path } as const;

  const field = (name: string, input: "number" | "text" | "toggle" | "duration" | "select", options?: readonly string[], optional?: boolean) => (
    <SpellOnlyField owner={owner} field={{ name, input, options, optional }} onChange={onChange} />
  );

  return (
    <>
      {field("attackKind", "select", ["melee", "ranged", "any"])}
      {field("extraDice", "text")}
      {field("damageType", "text")}
      {field("charges", "number")}
      {field("duration", "duration")}
      {field("target", "select", ["self", "eventTarget"], true)}
      {field("consumeOnMiss", "toggle")}
      {field("expireAtTurnEnd", "toggle")}
      <div className="col-span-6 flex items-center gap-2">
        <Switch id={`${path}.save.on`} checked={!!save} onCheckedChange={(on) => onChange({ ...effect, save: on ? { ability: "dexterity", onFail: [{ kind: "dealDamage", amount: { spellRoll: 100 } }] } : undefined })} />
        <Label htmlFor={`${path}.save.on`}>{t("spellEffects.fields.hitRider.save")}</Label>
      </div>
      {save && (
        <>
          <div className="col-span-3">
            <Label htmlFor={`${path}.save.ability`} className="text-xs text-muted-foreground">
              {t("spellEffects.zone.ability")}
            </Label>
            <SelectField id={`${path}.save.ability`} value={save.ability} options={ABILITY_KEYS.map((k) => ({ value: k, label: tc(`common.abilities.${k}.label`) }))} onValueChange={(a) => onChange({ ...effect, save: { ...save, ability: a as AbilityKey } })} />
          </div>
          <div className="col-span-6">
            <EffectListEditor
              effects={save.onFail}
              path={`${path}.save.onFail`}
              limits={{ min: 1, max: 3 }}
              labels={{ heading: t("spellEffects.fields.hitRider.onFail"), add: t("spellEffects.zone.addEffect") }}
              onChange={(onFail) => onChange({ ...effect, save: { ...save, onFail } })}
            />
          </div>
        </>
      )}
    </>
  );
}
