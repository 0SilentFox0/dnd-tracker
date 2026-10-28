"use client";

import { useState } from "react";

import { TemplateTile } from "./TemplateTile";

import { ImportDialog } from "@/components/common/ImportDialog";
import { HudSection } from "@/components/hud/form";
import { useBundleFilePicker, useTemplates } from "@/lib/hooks/campaigns";
import { pluralUk } from "@/lib/utils/common/plural";
import type { TemplateCard, TemplateSelection } from "@/types/campaigns";

interface TemplatePickerProps {
  value: TemplateSelection;
  onChange: (selection: TemplateSelection) => void;
}

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

  const isTemplate = (id: string) => !value.file && value.templateId === id;

  const renderCard = (t: TemplateCard) => (
    <TemplateTile key={t.id} title={t.name} footnote={t.credits ?? undefined} subtitle={[t.description, countsLabel(t)].filter(Boolean).join(" — ")} selected={isTemplate(t.id)} onClick={() => onChange({ templateId: t.id })} />
  );

  return (
    <>
      <HudSection title="Шаблон">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data?.official.map(renderCard)}
          {data?.mine.map(renderCard)}
          <TemplateTile
            title="Імпорт з файлу"
            subtitle={value.file ? `Файл: ${value.file.name}, ${value.file.entities} ${pluralUk(value.file.entities, ["сутність", "сутності", "сутностей"])}` : "JSON, експортований з іншої кампанії"}
            selected={!!value.file}
            onClick={() => setImportOpen(true)}
          />
          <TemplateTile title="Без шаблону" subtitle="Порожня бібліотека" selected={!value.file && !value.templateId} onClick={() => onChange({ templateId: null })} />
        </div>
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
