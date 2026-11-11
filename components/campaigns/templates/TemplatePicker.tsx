"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { ImportDialog } from "@/components/common/ImportDialog";
import { HudSection } from "@/components/hud/form";
import { HudPill } from "@/components/hud/page";
import { SelectField, type SelectOptionGroup } from "@/components/ui/select-field";
import { useBundleFilePicker, useTemplates } from "@/lib/hooks/campaigns";
import { NATIVE_LANGUAGE_NAMES } from "@/lib/i18n/native-language-names";
import { ruleSystemLabelKey } from "@/lib/i18n/system-scope";
import { groupTemplates, pickVariant } from "@/lib/utils/campaigns/template-variants";
import type { TemplateContentLocale } from "@/lib/utils/templates/manifest";
import { isCanonicalTemplate } from "@/lib/utils/templates/registry";
import type { TemplateCard, TemplateSelection } from "@/types/campaigns";

interface TemplatePickerProps {
  value: TemplateSelection;
  onChange: (selection: TemplateSelection) => void;
}

const FILE_VALUE = "__file";

const NONE_VALUE = "__none";

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  const t = useTranslations("campaigns.templatePicker");

  const tg = useTranslations("gameTerms");

  const uiLocale = useLocale();

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

  const officialGroups = groupTemplates(data?.official ?? []);

  const selectedGroup = officialGroups.find((g) => Object.values(g.cards).some((c) => c.id === value.templateId));

  const contentLocales = selected && isCanonicalTemplate(selected) ? selected.availableLocales ?? [] : [];

  const contentLocale = value.contentLocale ?? (contentLocales.includes(uiLocale) ? uiLocale : "en");

  // Resolve an externally supplied selection too, so the visible default is also submitted.
  useEffect(() => {
    if (selected && contentLocales.length > 0 && value.contentLocale === undefined) onChange({ templateId: selected.id, contentLocale: contentLocale as TemplateContentLocale });
  }, [selected, contentLocales.length, value.contentLocale, contentLocale, onChange]);

  const toGroupOption = (g: (typeof officialGroups)[number]) => toOption(g === selectedGroup && selected ? selected : pickVariant(g, uiLocale));

  const languageOptions = contentLocales.length > 0
    ? contentLocales.map((code) => ({ value: code, label: NATIVE_LANGUAGE_NAMES[code as keyof typeof NATIVE_LANGUAGE_NAMES] ?? code }))
    : (selectedGroup?.locales ?? []).map((code) => ({ value: selectedGroup?.cards[code].id ?? "", label: NATIVE_LANGUAGE_NAMES[code as keyof typeof NATIVE_LANGUAGE_NAMES] ?? code }));

  const countsLabel = ({ counts }: TemplateCard) =>
    [t("counts.races", { count: counts.races ?? 0 }), t("counts.units", { count: counts.units ?? 0 }), t("counts.spells", { count: counts.spells ?? 0 })].join(" · ");

  const groups: SelectOptionGroup[] = [
    { label: t("official"), options: officialGroups.map(toGroupOption) },
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
    else {
      const source = templates.find((tpl) => tpl.id === next);

      onChange({ templateId: next === NONE_VALUE ? null : next, ...(source && isCanonicalTemplate(source) ? { contentLocale: uiLocale === "uk" ? "uk" : "en" } : {}) });
    }
  };

  return (
    <>
      <HudSection title={t("section")}>
        <div className="space-y-2">
          <p className="text-sm text-hud-muted">
            {t("intro")}
          </p>
          <SelectField aria-label={t("ariaLabel")} value={current} onValueChange={handleChange} groups={groups} />
          {languageOptions.length > 1 && selected && <SelectField aria-label={t("languageLabel")} value={contentLocales.length > 0 ? contentLocale : selected.id} onValueChange={contentLocales.length > 0 ? (locale) => onChange({ templateId: selected.id, contentLocale: locale as TemplateContentLocale }) : handleChange} groups={[{ label: t("language"), options: languageOptions }]} />}
          {selected?.system && <HudPill tone="silver">{tg(ruleSystemLabelKey(selected.system))}</HudPill>}
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
