"use client";

import { EffectListEditor } from "./EffectListEditor";

import { useFieldErrors } from "@/components/abilities/editor-context";
import { FieldErrors } from "@/components/abilities/FieldErrors";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { ZoneTrigger } from "@/lib/utils/spells/model/schema";

type Check = "none" | "save" | "attack";

const CHECKS: Check[] = ["none", "save", "attack"];

interface ZoneTriggerEditorProps {
  value?: ZoneTrigger;
  onChange: (value?: ZoneTrigger) => void;
  path: string;
  label: string;
  allowPull?: boolean;
}

const checkOf = (v: ZoneTrigger): Check => (v.save ? "save" : v.attack ? "attack" : "none");

export function ZoneTriggerEditor({ value, onChange, path, label, allowPull = false }: ZoneTriggerEditorProps) {
  const t = useTranslator("editors");

  const tc = useTranslator();

  const errors = useFieldErrors(path);

  const withCheck = (v: ZoneTrigger, check: Check, ability: AbilityKey = v.save?.ability ?? "dexterity"): ZoneTrigger => {
    const { save: _save, attack: _attack, ...rest } = v;

    return { ...rest, ...(check === "save" && { save: { ability } }), ...(check === "attack" && { attack: "spell" as const }) };
  };

  return (
    <div className="col-span-6 space-y-2 rounded-md border border-dashed p-2">
      <div className="flex items-center gap-2">
        <Switch id={`${path}.on`} checked={!!value} onCheckedChange={(on) => onChange(on ? { effects: [] } : undefined)} />
        <Label htmlFor={`${path}.on`}>{label}</Label>
      </div>
      {value && (
        <>
          <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
            <div>
              <Label htmlFor={`${path}.check`} className="text-xs text-muted-foreground">
                {t("spellEffects.zone.check")}
              </Label>
              <SelectField id={`${path}.check`} value={checkOf(value)} options={CHECKS.map((c) => ({ value: c, label: t(`spellEffects.zone.checks.${c}`) }))} onValueChange={(c) => onChange(withCheck(value, c as Check))} />
            </div>
            {value.save && (
              <div>
                <Label htmlFor={`${path}.ability`} className="text-xs text-muted-foreground">
                  {t("spellEffects.zone.ability")}
                </Label>
                <SelectField id={`${path}.ability`} value={value.save.ability} options={ABILITY_KEYS.map((k) => ({ value: k, label: tc(`common.abilities.${k}.label`) }))} onValueChange={(a) => onChange(withCheck(value, "save", a as AbilityKey))} />
              </div>
            )}
          </div>
          {allowPull && (
            <div className="flex items-center gap-2">
              <Switch id={`${path}.pull`} checked={value.pull === "centre"} onCheckedChange={(on) => onChange({ ...value, pull: on ? "centre" : undefined })} />
              <Label htmlFor={`${path}.pull`}>{t("spellEffects.zone.pull")}</Label>
            </div>
          )}
          <EffectListEditor effects={value.effects} path={`${path}.effects`} limits={{ min: 0, max: 4 }} labels={{ heading: t("spellEffects.zone.effects"), add: t("spellEffects.zone.addEffect") }} onChange={(effects) => onChange({ ...value, effects })} />
        </>
      )}
      <FieldErrors errors={errors} />
    </div>
  );
}
