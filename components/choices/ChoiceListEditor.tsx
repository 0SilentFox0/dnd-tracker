"use client";

import { Plus } from "lucide-react";

import { ChoiceHeaderRow } from "./ChoiceHeaderRow";
import { AbilityScoreChoiceFields, OptionChoiceFields, SkillChoiceFields, SpellChoiceFields } from "./ChoiceKindFields";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABILITY_SCORE_CAP } from "@/lib/constants/abilities";
import { CHOICE_KINDS, CHOICE_LIMITS } from "@/lib/constants/choices";
import { useErrorTotals, useRowKeys } from "@/lib/hooks/common";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import type { Choice, ChoiceKind, ChoiceOwner } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

interface ChoiceListEditorProps {
  campaignId: string;
  owner: ChoiceOwner;
  value: Choice[];
  onChange: (next: Choice[]) => void;
  classColumns?: readonly ClassColumn[];
  onValidityChange?: (ok: boolean, errorCount: number) => void;
}

const KIND_DEFAULTS: Record<ChoiceKind, Partial<Choice>> = {
  option: { options: [] },
  feat: { featTypes: ["general"] },
  skill: {},
  expertise: {},
  abilityScore: { points: 2, max: ABILITY_SCORE_CAP },
  spell: { spells: { lists: [], minLevel: 0, maxLevel: 0 } },
};

export function ChoiceListEditor({ campaignId, owner, value, onChange, classColumns = [], onValidityChange }: ChoiceListEditorProps) {
  const { report, drop } = useErrorTotals(onValidityChange);

  const { keys, removeAt } = useRowKeys(value.length);

  const kinds = CHOICE_KINDS.filter((k) => owner !== "feat" || k !== "feat");

  const update = (i: number, patch: Partial<Choice>) => onChange(value.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const switchKind = (i: number, kind: ChoiceKind) => {
    const { id, label, level, count, description, lineage } = value[i];

    onChange(value.map((c, k) => (k === i ? { id, label, level, count, ...(description && { description }), ...(lineage && { lineage }), kind, ...KIND_DEFAULTS[kind] } : c)));
  };

  const add = () => onChange([...value, { id: choiceSlug("choice", value.map((c) => c.id)), label: "Новий вибір", level: 1, count: 1, kind: "skill" }]);

  const remove = (i: number) => {
    drop(`c${keys[i]}`);
    removeAt(i);
    onChange(value.filter((_, k) => k !== i));
  };

  return (
    <div className="space-y-3">
      {value.map((choice, i) => {
        const onPatch = (patch: Partial<Choice>) => update(i, patch);

        return (
          <fieldset key={keys[i]} className="space-y-3 rounded-md border border-hud-line/60 p-3">
            <ChoiceHeaderRow index={i} choice={choice} owner={owner} kinds={kinds} actions={{ onPatch, onSwitchKind: (kind) => switchKind(i, kind), onRemove: () => remove(i) }} />

            <div className="flex flex-wrap items-end gap-3">
              {choice.kind !== "abilityScore" && (
                <div className="w-24 space-y-1">
                  <Label htmlFor={`choice-${i}-count`}>Кількість</Label>
                  <Input id={`choice-${i}-count`} type="number" min={1} max={CHOICE_LIMITS.count} disabled={typeof choice.count !== "number"} value={typeof choice.count === "number" ? choice.count : ""} onChange={(e) => onPatch({ count: Number(e.target.value) || 1 })} />
                </div>
              )}
              {owner === "class" && choice.kind !== "abilityScore" && (
                <div className="space-y-1">
                  <Label htmlFor={`choice-${i}-scale`}>Кількість з таблиці класу</Label>
                  <select id={`choice-${i}-scale`} className={HUD_SELECT_CLASS} value={typeof choice.count === "number" ? "" : choice.count.scale} onChange={(e) => onPatch({ count: e.target.value ? { scale: e.target.value } : 1 })}>
                    <option value="">— число —</option>
                    {classColumns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {owner === "race" && choice.kind === "option" && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!choice.lineage} onCheckedChange={(on) => onPatch({ lineage: on ? true : undefined })} />
                  Лінія (назва опції → підраса)
                </label>
              )}
            </div>

            <Textarea aria-label="Опис вибору" rows={2} value={choice.description ?? ""} onChange={(e) => onPatch({ description: e.target.value || undefined })} />

            {(choice.kind === "skill" || choice.kind === "expertise") && <SkillChoiceFields choice={choice} onPatch={onPatch} />}
            {choice.kind === "abilityScore" && <AbilityScoreChoiceFields choice={choice} onPatch={onPatch} />}
            {choice.kind === "spell" && <SpellChoiceFields choice={choice} owner={owner} onPatch={onPatch} />}
            {(choice.kind === "option" || choice.kind === "feat") && (
              <OptionChoiceFields choice={choice} owner={owner} campaignId={campaignId} classColumns={classColumns} onPatch={onPatch} errors={{ report, drop, prefix: `c${keys[i]}` }} />
            )}
          </fieldset>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" />
        Додати вибір
      </Button>
    </div>
  );
}
