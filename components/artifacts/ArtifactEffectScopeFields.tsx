"use client";

import type { ArtifactEffectScopeDraft } from "./artifact-combat-draft";
import { ImmuneSpellsLibraryPicker } from "./ImmuneSpellsLibraryPicker";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { ARTIFACT_EFFECT_AUDIENCE_OPTIONS } from "@/lib/constants/artifact-effect-scope";

/** Не порожній рядок — Radix Select не дозволяє SelectItem з value="". */
const AUDIENCE_NONE_VALUE = "artifact-effect-audience-default";

const AUDIENCE_SELECT_OPTIONS = ARTIFACT_EFFECT_AUDIENCE_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

export interface ArtifactEffectScopeFieldsProps {
  value: ArtifactEffectScopeDraft;
  onChange: (next: ArtifactEffectScopeDraft) => void;
  /** Для вибору заклинань з бібліотеки кампанії. */
  campaignId: string;
  idPrefix?: string;
}

export function ArtifactEffectScopeFields({
  value,
  onChange,
  campaignId,
  idPrefix = "artifact",
}: ArtifactEffectScopeFieldsProps) {
  const p = idPrefix;

  return (
    <div className="space-y-3 rounded-md border bg-muted/10 p-3">
      <div>
        <p className="text-sm font-medium">На кого діє бонус пасива / плоских властивостей</p>
        <p className="text-xs text-muted-foreground mt-1">
          «Уся команда» та «Усі вороги» застосовуються після збору всіх учасників бою. Імунітет до
          заклинань зберігається в бою за ID заклинань кампанії.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${p}-effect-audience`}>Аудиторія</Label>
        <SelectField
          id={`${p}-effect-audience`}
          allowNone
          noneLabel="За замовчуванням (лише носій)"
          noneValue={AUDIENCE_NONE_VALUE}
          value={value.audience}
          onValueChange={(audience) => onChange({ ...value, audience })}
          placeholder="Аудиторія"
          options={AUDIENCE_SELECT_OPTIONS}
        />
      </div>
      <ImmuneSpellsLibraryPicker
        campaignId={campaignId}
        selectedIds={value.immuneSpellIds ?? []}
        onChange={(immuneSpellIds) => onChange({ ...value, immuneSpellIds })}
        idPrefix={`${p}-immune`}
      />
    </div>
  );
}
