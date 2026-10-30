"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { HudCard } from "@/components/hud/page";
import { SelectField } from "@/components/ui/select-field";
import { NATIVE_LANGUAGE_NAMES } from "@/lib/i18n/native-language-names";
import { groupTemplates, pickVariant, type TemplateGroup } from "@/lib/utils/campaigns/template-variants";

export interface TemplateTile {
  id: string;
  name: string;
  description: string | null;
  locale: string | null;
  templateKey: string | null;
}

const languageName = (code: string) => NATIVE_LANGUAGE_NAMES[code as keyof typeof NATIVE_LANGUAGE_NAMES] ?? code;

function TemplateGroupTile({ group }: { group: TemplateGroup<TemplateTile> }) {
  const t = useTranslations("campaigns.templatePicker");

  const uiLocale = useLocale();

  const [pickedId, setPickedId] = useState<string | null>(null);

  const variant = Object.values(group.cards).find((c) => c.id === pickedId) ?? pickVariant(group, uiLocale);

  const options = group.locales.map((code) => ({ value: group.cards[code].id, label: languageName(code) }));

  return (
    <HudCard className="space-y-2">
      <Link href={`/campaigns/${variant.id}`} className="block space-y-2">
        <h3 className="hud-sc text-lg text-hud-ink">{variant.name}</h3>
        {variant.description && <p className="text-sm text-hud-muted">{variant.description}</p>}
      </Link>
      {options.length > 1 ? (
        <SelectField aria-label={t("languageLabel")} value={variant.id} onValueChange={setPickedId} groups={[{ label: t("language"), options }]} />
      ) : (
        variant.locale && <p className="text-xs text-hud-muted">{languageName(variant.locale)}</p>
      )}
    </HudCard>
  );
}

export function TemplateTiles({ templates }: { templates: TemplateTile[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {groupTemplates(templates).map((group) => (
        <TemplateGroupTile key={group.key} group={group} />
      ))}
    </div>
  );
}
