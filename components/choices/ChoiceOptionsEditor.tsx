"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { OptionSpellsEditor } from "./OptionSpellsEditor";

import { AbilityListEditor } from "@/components/abilities";
import { MarkdownLite } from "@/components/common/MarkdownLite";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { useRowKeys } from "@/lib/hooks/common";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import { toggleItem } from "@/lib/utils/common/collections";
import { hasMarkdownTable } from "@/lib/utils/text/markdown-lite";
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
  const t = useTranslations("choices");

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
          <details key={keys[i]} open={!option.name} className="rounded-md border border-hud-line/40">
            <summary className="cursor-pointer px-3 py-2 text-sm">{option.name || t("options.unnamed")}</summary>
            <div className="space-y-2 p-3 pt-1">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`${optionKey}-name`}>{t("options.name")}</Label>
                  <Input id={`${optionKey}-name`} value={option.name} onChange={(e) => rename(i, e.target.value)} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("options.remove", { name: option.name })}
                  onClick={() => {
                    errors.drop(optionKey);
                    removeAt(i);
                    onChange(value.filter((_, k) => k !== i));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${optionKey}-description`}>{t("options.description")}</Label>
              <Textarea id={`${optionKey}-description`} rows={2} value={option.description ?? ""} onChange={(e) => set(i, { description: e.target.value || undefined })} />
              {option.description && hasMarkdownTable(option.description) && <MarkdownLite className="space-y-2 rounded-md border border-hud-line/40 p-2 text-sm" text={option.description} />}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                {t("options.minLevel")}
                <Input type="number" min={1} max={MAX_CLASS_LEVEL} className="w-20" aria-label={t("options.minLevelAria")} value={option.minLevel ?? ""} onChange={(e) => set(i, { minLevel: e.target.value ? Number(e.target.value) : undefined })} />
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
                    {t("options.requires", { name: o.name })}
                  </label>
                ))}
            </div>
            <AbilityListEditor campaignId={campaignId} value={option.abilities} onChange={(abilities) => set(i, { abilities })} classColumns={owner === "class" ? classColumns : undefined} onValidityChange={(_, n) => errors.report(optionKey, n)} />
            {owner === "race" && <OptionSpellsEditor campaignId={campaignId} value={option.spells ?? []} onChange={(spells) => set(i, { spells: spells.length > 0 ? spells : undefined })} />}
            <details className="rounded-md border border-hud-line/30 px-3 py-2 text-sm">
              <summary className="cursor-pointer text-hud-muted">{t("header.technical")}</summary>
              <div className="mt-2 w-56 space-y-1">
                <Label htmlFor={`${optionKey}-id`}>{t("options.id")}</Label>
                <Input id={`${optionKey}-id`} value={option.id} onChange={(e) => set(i, { id: e.target.value })} />
                <p className="text-xs text-hud-muted">{t("options.idHint")}</p>
              </div>
            </details>
            </div>
          </details>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { id: choiceSlug("option", value.map((o) => o.id)), name: "", abilities: [] }])}>
        <Plus className="h-4 w-4" />
        {t("options.add")}
      </Button>
    </div>
  );
}
