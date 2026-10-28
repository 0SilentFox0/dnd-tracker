"use client";

import { Plus, Trash2 } from "lucide-react";

import { OptionSpellsEditor } from "./OptionSpellsEditor";

import { AbilityListEditor } from "@/components/abilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { useRowKeys } from "@/lib/hooks/common";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import { toggleItem } from "@/lib/utils/common/collections";
import type { ChoiceOption, ChoiceOwner } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

interface ChoiceOptionsEditorProps {
  campaignId: string;
  owner: ChoiceOwner;
  value: ChoiceOption[];
  onChange: (next: ChoiceOption[]) => void;
  classColumns?: readonly ClassColumn[];
  errors: { report: (key: string, count: number) => void; drop: (key: string) => void; prefix: string };
}

export function ChoiceOptionsEditor({ campaignId, owner, value, onChange, classColumns, errors }: ChoiceOptionsEditorProps) {
  const { keys, removeAt } = useRowKeys(value.length);

  const set = (i: number, patch: Partial<ChoiceOption>) => onChange(value.map((o, k) => (k === i ? { ...o, ...patch } : o)));

  const rename = (i: number, name: string) => {
    const others = value.filter((_, k) => k !== i).map((o) => o.id);

    const fresh = !value[i].name || value[i].id === choiceSlug(value[i].name, others);

    set(i, { name, ...(fresh && { id: choiceSlug(name, others) }) });
  };

  return (
    <div className="space-y-3">
      {value.map((option, i) => {
        const optionKey = `${errors.prefix}-o${keys[i]}`;

        return (
          <fieldset key={keys[i]} className="space-y-2 rounded-md border border-hud-line/40 p-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`${optionKey}-name`}>Назва опції</Label>
                <Input id={`${optionKey}-name`} value={option.name} onChange={(e) => rename(i, e.target.value)} />
              </div>
              <div className="w-40 space-y-1">
                <Label htmlFor={`${optionKey}-id`}>Id</Label>
                <Input id={`${optionKey}-id`} value={option.id} onChange={(e) => set(i, { id: e.target.value })} />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Видалити опцію ${option.name}`}
                onClick={() => {
                  errors.drop(optionKey);
                  removeAt(i);
                  onChange(value.filter((_, k) => k !== i));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea aria-label="Опис опції" rows={2} value={option.description ?? ""} onChange={(e) => set(i, { description: e.target.value || undefined })} />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                Мін. рівень
                <Input type="number" min={1} max={MAX_CLASS_LEVEL} className="w-20" aria-label="Мінімальний рівень опції" value={option.minLevel ?? ""} onChange={(e) => set(i, { minLevel: e.target.value ? Number(e.target.value) : undefined })} />
              </label>
              {value
                .filter((o) => o.id !== option.id)
                .map((o) => (
                  <label key={o.id} className="flex items-center gap-1">
                    <Checkbox
                      checked={option.requires?.includes(o.id) ?? false}
                      onCheckedChange={() => {
                        const next = toggleItem(option.requires, o.id);

                        set(i, { requires: next.length > 0 ? next : undefined });
                      }}
                    />
                    потребує «{o.name}»
                  </label>
                ))}
            </div>
            <AbilityListEditor campaignId={campaignId} value={option.abilities} onChange={(abilities) => set(i, { abilities })} classColumns={owner === "class" ? classColumns : undefined} onValidityChange={(_, n) => errors.report(optionKey, n)} />
            {owner === "race" && <OptionSpellsEditor campaignId={campaignId} value={option.spells ?? []} onChange={(spells) => set(i, { spells: spells.length > 0 ? spells : undefined })} />}
          </fieldset>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { id: choiceSlug("option", value.map((o) => o.id)), name: "", abilities: [] }])}>
        <Plus className="h-4 w-4" />
        Додати опцію
      </Button>
    </div>
  );
}
