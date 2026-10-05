"use client";

import type { FieldProps } from "./FieldRenderer";

import { useAbilityEditor } from "@/components/abilities/editor-context";
import { SpellMultiSelect } from "@/components/characters/spells/SpellMultiSelect";

export function SpellPickerField({ value, onChange }: FieldProps<string[] | undefined>) {
  const { campaignId } = useAbilityEditor();

  return <SpellMultiSelect campaignId={campaignId} selectedSpellIds={value ?? []} onSelectionChange={(ids) => onChange(ids.length ? ids : undefined)} />;
}
