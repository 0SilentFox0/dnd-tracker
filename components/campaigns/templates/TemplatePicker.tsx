"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ImportDialog } from "@/components/common/ImportDialog";
import { HudSection } from "@/components/hud/form";
import { SelectField, type SelectOptionGroup } from "@/components/ui/select-field";
import { useBundleFilePicker, useTemplates } from "@/lib/hooks/campaigns";
import type { TemplateCard, TemplateSelection } from "@/types/campaigns";

interface TemplatePickerProps {
  value: TemplateSelection;
  onChange: (selection: TemplateSelection) => void;
}

const FILE_VALUE = "__file";

const NONE_VALUE = "__none";

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  const t = useTranslations("campaigns.templatePicker");

  const { data } = useTemplates();

  const [importOpen, setImportOpen] = useState(false);

  const picker = useBundleFilePicker((file) => {
    onChange({ file });
    setImportOpen(false);
  });

  const templates = [...(data?.official ?? []), ...(data?.mine ?? [])];

  const selected = value.file ? undefined : templates.find((tpl) => tpl.id === value.templateId);

  const current = value.file ? FILE_VALUE : (value.templateId ?? NONE_VALUE);

  const toOption = (tpl: TemplateCard) => ({ value: tpl.id, label: tpl.name });

  const countsLabel = ({ counts }: TemplateCard) =>
    [t("counts.races", { count: counts.races ?? 0 }), t("counts.units", { count: counts.units ?? 0 }), t("counts.spells", { count: counts.spells ?? 0 })].join(" · ");

  const groups: SelectOptionGroup[] = [
    { label: t("official"), options: (data?.official ?? []).map(toOption) },
    { label: t("mine"), options: (data?.mine ?? []).map(toOption) },
    {
      label: t("other"),
      options: [
        { value: FILE_VALUE, label: value.file ? t("file", { name: value.file.name }) : t("importFile") },
        { value: NONE_VALUE, label: t("none") },
      ],
    },
  ].filter((g) => g.options.length > 0);

  const handleChange = (next: string) => {
    if (!next) return;

    if (next === FILE_VALUE) setImportOpen(true);
    else onChange({ templateId: next === NONE_VALUE ? null : next });
  };

  return (
    <>
      <HudSection title={t("section")}>
        <div className="space-y-2">
          <p className="text-sm text-hud-muted">
            {t("intro")}
          </p>
          <SelectField aria-label={t("ariaLabel")} value={current} onValueChange={handleChange} groups={groups} />
          {selected && <p className="text-xs text-hud-muted">{[selected.description, countsLabel(selected)].filter(Boolean).join(" — ")}</p>}
          {selected?.credits && <p className="line-clamp-2 text-[11px] leading-4 text-hud-muted/80">{selected.credits}</p>}
          {value.file && (
            <p className="text-xs text-hud-muted">
              {t("entities", { count: value.file.entities })} ·{" "}
              <button type="button" className="underline" onClick={() => setImportOpen(true)}>
                {t("pickAnother")}
              </button>
            </p>
          )}
        </div>
      </HudSection>
      <ImportDialog
        hideTrigger
        accept=".json"
        title={t("importFile")}
        description={t("importDescription")}
        importHook={picker}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </>
  );
}
