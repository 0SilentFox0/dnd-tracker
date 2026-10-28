"use client";

import { Plus, Trash2 } from "lucide-react";

import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";
import { SpellGrantEditor } from "./SpellGrantEditor";

import { useErrorTotals } from "@/components/classes/use-error-totals";
import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABILITY_KEYS, ABILITY_LABELS } from "@/lib/constants/abilities";
import { CHOICE_KIND_LABELS, CHOICE_KINDS, FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import { DND_SKILL_META, DND_SKILLS } from "@/lib/constants/skills";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import { toggleItem } from "@/lib/utils/common/collections";
import { parseCommaList } from "@/lib/utils/common/text";
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
  abilityScore: { points: 2, max: 20 },
  spell: { spells: { lists: [], minLevel: 0, maxLevel: 0 } },
};

const CIRCLES = Array.from({ length: 10 }, (_, i) => i);

export function ChoiceListEditor({ campaignId, owner, value, onChange, classColumns = [], onValidityChange }: ChoiceListEditorProps) {
  const { report, drop } = useErrorTotals(onValidityChange);

  const kinds = CHOICE_KINDS.filter((k) => owner !== "feat" || k !== "feat");

  const update = (i: number, patch: Partial<Choice>) => onChange(value.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const switchKind = (i: number, kind: ChoiceKind) => {
    const { id, label, level, count, description, lineage } = value[i];

    onChange(value.map((c, k) => (k === i ? { id, label, level, count, ...(description && { description }), ...(lineage && { lineage }), kind, ...KIND_DEFAULTS[kind] } : c)));
  };

  const add = () => onChange([...value, { id: choiceSlug("choice", value.map((c) => c.id)), label: "Новий вибір", level: 1, count: 1, kind: "skill" }]);

  const remove = (i: number) => {
    drop(`c${i}`);
    onChange(value.filter((_, k) => k !== i));
  };

  return (
    <div className="space-y-3">
      {value.map((choice, i) => (
        <fieldset key={i} className="space-y-3 rounded-md border border-hud-line/60 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1 space-y-1">
              <Label htmlFor={`choice-${i}-label`}>Назва вибору</Label>
              <Input id={`choice-${i}-label`} value={choice.label} onChange={(e) => update(i, { label: e.target.value })} />
            </div>
            <div className="w-40 space-y-1">
              <Label htmlFor={`choice-${i}-id`}>Id вибору</Label>
              <Input id={`choice-${i}-id`} value={choice.id} onChange={(e) => update(i, { id: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`choice-${i}-kind`}>Вид вибору</Label>
              <select id={`choice-${i}-kind`} className={HUD_SELECT_CLASS} value={choice.kind} onChange={(e) => switchKind(i, e.target.value as ChoiceKind)}>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {CHOICE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            {owner !== "feat" && (
              <div className="w-24 space-y-1">
                <Label htmlFor={`choice-${i}-level`}>Рівень вибору</Label>
                <Input id={`choice-${i}-level`} type="number" min={1} max={20} value={choice.level} onChange={(e) => update(i, { level: Number(e.target.value) || 1 })} />
              </div>
            )}
            <Button type="button" variant="ghost" size="sm" aria-label={`Видалити вибір ${choice.label}`} onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {choice.kind !== "abilityScore" && (
              <div className="w-24 space-y-1">
                <Label htmlFor={`choice-${i}-count`}>Кількість</Label>
                <Input id={`choice-${i}-count`} type="number" min={1} max={30} disabled={typeof choice.count !== "number"} value={typeof choice.count === "number" ? choice.count : ""} onChange={(e) => update(i, { count: Number(e.target.value) || 1 })} />
              </div>
            )}
            {owner === "class" && choice.kind !== "abilityScore" && (
              <div className="space-y-1">
                <Label htmlFor={`choice-${i}-scale`}>Кількість з таблиці класу</Label>
                <select id={`choice-${i}-scale`} className={HUD_SELECT_CLASS} value={typeof choice.count === "number" ? "" : choice.count.scale} onChange={(e) => update(i, { count: e.target.value ? { scale: e.target.value } : 1 })}>
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
                <Checkbox checked={!!choice.lineage} onCheckedChange={(on) => update(i, { lineage: on ? true : undefined })} />
                Лінія (назва опції → підраса)
              </label>
            )}
          </div>

          <Textarea aria-label="Опис вибору" rows={2} value={choice.description ?? ""} onChange={(e) => update(i, { description: e.target.value || undefined })} />

          {choice.kind === "feat" && (
            <div className="flex flex-wrap gap-3 text-sm">
              {FEAT_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1">
                  <Checkbox checked={choice.featTypes?.includes(t) ?? false} onCheckedChange={() => update(i, { featTypes: toggleItem(choice.featTypes, t) })} />
                  {FEAT_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          )}

          {(choice.kind === "skill" || choice.kind === "expertise") && (
            <div className="space-y-1">
              <p className="text-xs text-hud-muted">Порожньо — будь-яка навичка{choice.kind === "expertise" ? " з майстерністю" : ""}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {DND_SKILLS.map((s) => (
                  <label key={s} className="flex items-center gap-1">
                    <Checkbox checked={choice.skills?.includes(s) ?? false} onCheckedChange={() => update(i, { skills: toggleItem(choice.skills, s) })} />
                    {DND_SKILL_META[s].label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {choice.kind === "abilityScore" && <label className="block text-sm">Не більше +1 на одну характеристику
            <Input type="number" min={1} max={4} aria-label="Ліміт на одну характеристику" value={choice.maxPerAbility ?? ""} onChange={(e) => update(i, { maxPerAbility: e.target.value ? Number(e.target.value) : undefined })} />
          </label>}
          {choice.kind === "abilityScore" && (
            <div className="flex flex-wrap items-end gap-3 text-sm">
              {ABILITY_KEYS.map((a) => (
                <label key={a} className="flex items-center gap-1">
                  <Checkbox checked={choice.abilities?.includes(a) ?? false} onCheckedChange={() => update(i, { abilities: toggleItem(choice.abilities, a) })} />
                  {ABILITY_LABELS[a]}
                </label>
              ))}
              <label className="flex items-center gap-2">
                +1 разів
                <Input type="number" min={1} max={4} className="w-20" aria-label="Скільки разів +1" value={choice.points ?? 1} onChange={(e) => update(i, { points: Number(e.target.value) || 1 })} />
              </label>
              <label className="flex items-center gap-2">
                Межа
                <Input type="number" min={1} max={30} className="w-20" aria-label="Межа характеристики" value={choice.max ?? 20} onChange={(e) => update(i, { max: Number(e.target.value) || 20 })} />
              </label>
            </div>
          )}

          {choice.kind === "spell" && <SpellGrantEditor value={choice.grant} onChange={(grant) => update(i, { grant })} />}
          {choice.kind === "spell" && choice.spells && ((spellRule) => (
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="flex flex-1 items-center gap-2">
                Списки
                <Input aria-label="Списки заклинань" placeholder="Wizard, Cleric" value={spellRule.lists.join(", ")} onChange={(e) => update(i, { spells: { ...spellRule, lists: parseCommaList(e.target.value) } })} />
              </label>
              <label className="flex items-center gap-2">
                Від кола
                <select aria-label="Найнижче коло" className={HUD_SELECT_CLASS} value={spellRule.minLevel} onChange={(e) => update(i, { spells: { ...spellRule, minLevel: Number(e.target.value) } })}>
                  {CIRCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                До кола
                <select aria-label="Найвище коло" className={HUD_SELECT_CLASS} value={String(spellRule.maxLevel)} onChange={(e) => update(i, { spells: { ...spellRule, maxLevel: e.target.value === "slots" ? "slots" : Number(e.target.value) } })}>
                  {CIRCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {owner === "class" && <option value="slots">Найвище коло слотів класу</option>}
                </select>
              </label>
            </div>
          ))(choice.spells)}

          {(choice.kind === "option" || choice.kind === "feat") && (
            <div className="space-y-2">
              {choice.kind === "feat" && <p className="text-xs text-hud-muted">Вбудовані опції замість риси (напр. Blessed Warrior)</p>}
              <ChoiceOptionsEditor campaignId={campaignId} owner={owner} value={choice.options ?? []} onChange={(options) => update(i, { options })} classColumns={classColumns} errors={{ report, drop, prefix: `c${i}` }} />
            </div>
          )}
        </fieldset>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" />
        Додати вибір
      </Button>
    </div>
  );
}
