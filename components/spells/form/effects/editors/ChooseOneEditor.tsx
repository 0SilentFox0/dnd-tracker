"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";

import { useFieldErrors } from "@/components/abilities/editor-context";
import { FieldErrors } from "@/components/abilities/FieldErrors";
import { EffectListEditor } from "@/components/spells/form/effects/EffectListEditor";
import { useTranslator } from "@/lib/i18n/use-translator";

export function ChooseOneEditor({ effect, path, onChange }: SpellOnlyEditorProps<"chooseOne">) {
  const t = useTranslator("editors");

  const errors = useFieldErrors(`${path}.options`);

  return (
    <>
      <div className="col-span-6">
        <EffectListEditor
          effects={effect.options}
          path={`${path}.options`}
          limits={{ min: 2, max: 7 }}
          labels={{ heading: t("spellEffects.nested.chooseOneHeading"), add: t("spellEffects.nested.chooseOneAdd") }}
          onChange={(options) => onChange({ ...effect, options })}
        />
      </div>
      <div className="col-span-6">
        <FieldErrors errors={errors} />
      </div>
    </>
  );
}
