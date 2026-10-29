"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";
import { SpellOnlyField } from "../SpellOnlyField";

import { useFieldErrors } from "@/components/abilities/editor-context";
import { FieldErrors } from "@/components/abilities/FieldErrors";
import { EffectListEditor } from "@/components/spells/form/effects/EffectListEditor";
import { SpellTargetingFields } from "@/components/spells/form/SpellTargetingFields";
import { SelectField } from "@/components/ui/select-field";
import { useTranslator } from "@/lib/i18n/use-translator";
import { GRANT_CAST_COSTS } from "@/lib/utils/spells/model/schema";

const DIE_SIDES = ["4", "6", "8", "10", "12", "20"];

export function GrantCastEditor({ effect, path, onChange }: SpellOnlyEditorProps<"grantCast">) {
  const t = useTranslator("editors");

  const { cast } = effect;

  const castPath = `${path}.cast`;

  const resolutionErrors = useFieldErrors(`${castPath}.resolution`);

  const owner = { kind: "grantCast", effect, path } as const;

  const field = (name: string, input: "number" | "text" | "toggle" | "duration" | "select", options?: readonly string[], optional?: boolean) => (
    <SpellOnlyField owner={owner} field={{ name, input, options, optional }} onChange={onChange} />
  );

  return (
    <>
      {field("label", "text")}
      {field("cost", "select", GRANT_CAST_COSTS)}
      {field("uses", "number")}
      {field("duration", "duration")}
      {field("target", "select", ["self", "eventTarget"], true)}
      <p className="col-span-6 text-xs font-medium">{t("spellEffects.fields.grantCast.castHeading")}</p>
      <div className="col-span-6 grid grid-cols-2 gap-4 [&>*]:min-w-0">
        <SpellTargetingFields value={{ targeting: cast.targeting, resolution: cast.resolution }} onChange={(next) => onChange({ ...effect, cast: { ...cast, ...next } })} classesEnabled idPrefix={castPath} />
      </div>
      <div className="col-span-6">
        <FieldErrors errors={resolutionErrors} />
      </div>
      {field("cast.dice", "number")}
      <div className="col-span-2 space-y-1">
        <label htmlFor={`${castPath}.dieSides`} className="text-xs text-muted-foreground">
          {t("spellEffects.fields.grantCast.cast.dieSides")}
        </label>
        <SelectField id={`${castPath}.dieSides`} value={cast.dieSides ? String(cast.dieSides) : ""} allowNone noneLabel="—" options={DIE_SIDES.map((n) => ({ value: n, label: `d${n}` }))} onValueChange={(v) => onChange({ ...effect, cast: { ...cast, dieSides: v ? (parseInt(v) as 4 | 6 | 8 | 10 | 12 | 20) : undefined } })} />
      </div>
      {field("cast.damageBonus", "number")}
      {field("cast.addAbilityMod", "toggle")}
      <div className="col-span-6">
        <EffectListEditor
          effects={cast.effects}
          path={`${castPath}.effects`}
          limits={{ min: 1, max: 6 }}
          labels={{ heading: t("spellEffects.fields.grantCast.castEffects"), add: t("spellEffects.zone.addEffect") }}
          onChange={(effects) => onChange({ ...effect, cast: { ...cast, effects } })}
        />
      </div>
      <details className="col-span-6">
        <summary className="cursor-pointer text-xs text-muted-foreground">{t("spellEffects.fields.grantCast.advanced")}</summary>
        <div className="mt-2 grid grid-cols-6 items-end gap-2 [&>*]:min-w-0">
          {field("cast.anchorMarkId", "text")}
          {field("cast.perObjectFeet", "number")}
          {field("cast.auto.on", "select", ["attackAgainstMarked", "damageToMarked"], true)}
        </div>
      </details>
    </>
  );
}
