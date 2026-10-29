"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";

import { useFieldErrors } from "@/components/abilities/editor-context";
import { EffectCard } from "@/components/abilities/EffectCard";
import { FieldErrors } from "@/components/abilities/FieldErrors";
import { NestedEffectsEditor } from "@/components/abilities/NestedEffectsEditor";
import { useTranslator } from "@/lib/i18n/use-translator";
import { allowedEffectKinds, newEffect } from "@/lib/utils/abilities/editor";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { NonRandomEffect } from "@/lib/utils/abilities/schema/effects";
import { SPELL_EFFECT_TRIGGER } from "@/lib/utils/spells/editor/spell-only";

const KINDS = allowedEffectKinds(SPELL_EFFECT_TRIGGER).filter((k) => k !== "randomOf");

export function ChooseOneEditor({ effect, path, onChange }: SpellOnlyEditorProps<"chooseOne">) {
  const t = useTranslator("editors");

  const errors = useFieldErrors(`${path}.options`);

  return (
    <>
      <NestedEffectsEditor
        effects={effect.options}
        path={`${path}.options`}
        limits={{ min: 2, max: 7 }}
        labels={{ heading: t("spellEffects.nested.chooseOneHeading"), add: t("spellEffects.nested.chooseOneAdd") }}
        create={() => newEffect("heal", SPELL_EFFECT_TRIGGER) as NonRandomEffect}
        onChange={(options) => onChange({ ...effect, options })}
        renderCard={({ effect: option, path: optionPath, actions }) => (
          <EffectCard effect={option as Effect} trigger={SPELL_EFFECT_TRIGGER} path={optionPath} kinds={KINDS} actions={{ ...actions, onChange: (next) => actions.onChange(next as NonRandomEffect) }} />
        )}
      />
      <div className="col-span-6">
        <FieldErrors errors={errors} />
      </div>
    </>
  );
}
