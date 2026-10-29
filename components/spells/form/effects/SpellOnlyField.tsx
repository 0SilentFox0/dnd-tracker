"use client";

import { FieldRenderer } from "@/components/abilities/fields/FieldRenderer";
import { useTranslator } from "@/lib/i18n/use-translator";
import { getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import type { FieldInput } from "@/lib/utils/abilities/registry/fields";
import type { SpellOnlyEffect, SpellOnlyKind } from "@/lib/utils/spells/editor/spell-only";
import { pruneEmpty } from "@/lib/utils/spells/editor/spell-only";

interface SpellOnlyFieldProps<K extends SpellOnlyKind> {
  owner: { kind: K; effect: SpellOnlyEffect<K>; path: string };
  field: { name: string; input: FieldInput; options?: readonly string[]; optional?: boolean };
  onChange: (effect: SpellOnlyEffect<K>) => void;
}

export function SpellOnlyField<K extends SpellOnlyKind>({ owner, field, onChange }: SpellOnlyFieldProps<K>) {
  const t = useTranslator("editors");

  const meta = {
    name: field.name,
    input: field.input,
    optional: field.optional,
    label: t(`spellEffects.fields.${owner.kind}.${field.name}`),
    options: field.options?.map((value) => ({ value, label: t(`spellEffects.options.${field.name}.${value}`) })),
  };

  return (
    <FieldRenderer
      meta={meta}
      path={`${owner.path}.${field.name}`}
      value={getAtPath(owner.effect, field.name)}
      onChange={(v) => onChange(pruneEmpty(setAtPath(owner.effect, field.name, v)))}
    />
  );
}
