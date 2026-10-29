"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

import { MarkerPickerDialog } from "./MarkerPickerDialog";
import { OrderButtons } from "./OrderButtons";

import { MarkerChip } from "@/components/scenario/MarkerChip";
import { SectionIcon } from "@/components/scenario/SectionIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SECTION_ICON_KEYS } from "@/lib/constants/scenario";
import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { ScenarioMarkerRef, ScenarioSection, SectionIconKey } from "@/types/scenario";

type Actions = { onTitle: (title: string) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void; onIcon: (icon: SectionIconKey | undefined) => void; onMarker: (marker: ScenarioMarkerRef | undefined) => void };

export function SectionHeaderEditor({ campaignId, section, actions }: { campaignId: string; section: ScenarioSection; actions: Actions }) {
  const t = useTranslations("scenario.sectionHeader");

  const tIcons = useTranslations("scenario.sectionIcons");

  const [picking, setPicking] = useState(false);

  return (
    <h2 className="sb-sec-edit">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="toggle sb-icon-pick" aria-label={t("icon", { icon: section.icon ? tIcons(section.icon) : t("auto") })}>
            <SectionIcon name={sectionIcon(section)} className="sb-sec-icon" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => actions.onIcon(undefined)}>{t("autoItem")}</DropdownMenuItem>
          <DropdownMenuSeparator />
          {SECTION_ICON_KEYS.map((key) => (
            <DropdownMenuItem key={key} onSelect={() => actions.onIcon(key)}>
              <SectionIcon name={key} className="size-4" /> {tIcons(key)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <input aria-label={t("title")} value={section.title} maxLength={200} onChange={(e) => actions.onTitle(e.target.value)} style={{ font: "inherit", background: "transparent", color: "inherit", border: 0, flex: 1, minWidth: 0 }} />
      {section.marker ? (
        <MarkerChip campaignId={campaignId} marker={section.marker} onRemove={() => actions.onMarker(undefined)} />
      ) : (
        <button type="button" className="toggle" aria-label={t("bindMarker")} onClick={() => setPicking(true)}>
          <MapPin className="size-3.5" />
        </button>
      )}
      {picking && <MarkerPickerDialog campaignId={campaignId} open onOpenChange={setPicking} onPick={actions.onMarker} />}
      <OrderButtons
        labels={{ up: t("up", { title: section.title }), down: t("down", { title: section.title }), remove: t("remove", { title: section.title }) }}
        onMove={actions.onMove}
        onRemove={actions.onRemove}
      />
    </h2>
  );
}
