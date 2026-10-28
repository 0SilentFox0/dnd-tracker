"use client";

import { useState } from "react";

import { ImportDialog } from "@/components/common/ImportDialog";
import { HudSection } from "@/components/hud/form";
import { SelectField, type SelectOptionGroup } from "@/components/ui/select-field";
import { useBundleFilePicker, useTemplates } from "@/lib/hooks/campaigns";
import { pluralUk } from "@/lib/utils/common/plural";
import type { TemplateCard, TemplateSelection } from "@/types/campaigns";

interface TemplatePickerProps {
  value: TemplateSelection;
  onChange: (selection: TemplateSelection) => void;
}

const FILE_VALUE = "__file";

const NONE_VALUE = "__none";

const countPart = (n = 0, forms: [string, string, string]) => `${n} ${pluralUk(n, forms)}`;

const countsLabel = ({ counts }: TemplateCard) =>
  [
    countPart(counts.races, ["раса", "раси", "рас"]),
    countPart(counts.units, ["юніт", "юніти", "юнітів"]),
    countPart(counts.spells, ["заклинання", "заклинання", "заклинань"]),
  ].join(" · ");

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  const { data } = useTemplates();

  const [importOpen, setImportOpen] = useState(false);

  const picker = useBundleFilePicker((file) => {
    onChange({ file });
    setImportOpen(false);
  });

  const templates = [...(data?.official ?? []), ...(data?.mine ?? [])];

  const selected = value.file ? undefined : templates.find((t) => t.id === value.templateId);

  const current = value.file ? FILE_VALUE : (value.templateId ?? NONE_VALUE);

  const toOption = (t: TemplateCard) => ({ value: t.id, label: t.name });

  const groups: SelectOptionGroup[] = [
    { label: "Офіційні", options: (data?.official ?? []).map(toOption) },
    { label: "Мої", options: (data?.mine ?? []).map(toOption) },
    {
      label: "Інше",
      options: [
        { value: FILE_VALUE, label: value.file ? `Файл: ${value.file.name}` : "Імпорт з файлу" },
        { value: NONE_VALUE, label: "Без шаблону" },
      ],
    },
  ].filter((g) => g.options.length > 0);

  const handleChange = (next: string) => {
    if (next === FILE_VALUE) setImportOpen(true);
    else onChange({ templateId: next === NONE_VALUE ? null : next });
  };

  return (
    <>
      <HudSection title="Шаблон">
        <p className="text-sm text-hud-muted">
          Шаблон — готова основа кампанії: набір правил і контенту (раси, класи, юніти, заклинання, артефакти, навички, музика), який копіюється у вашу кампанію. Далі ви змінюєте його як завгодно. «Без шаблону» дає порожню бібліотеку.
        </p>
        <SelectField aria-label="Шаблон" value={current} onValueChange={handleChange} groups={groups} />
        {selected && (
          <p className="text-xs text-hud-muted">{[selected.description, countsLabel(selected)].filter(Boolean).join(" — ")}</p>
        )}
        {selected?.credits && <p className="line-clamp-2 text-[11px] leading-4 text-hud-muted/80">{selected.credits}</p>}
        {value.file && (
          <p className="text-xs text-hud-muted">{value.file.entities} {pluralUk(value.file.entities, ["сутність", "сутності", "сутностей"])}</p>
        )}
      </HudSection>
      <ImportDialog
        hideTrigger
        accept=".json"
        title="Імпорт з файлу"
        description="Оберіть JSON, експортований з кампанії"
        importHook={picker}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </>
  );
}
