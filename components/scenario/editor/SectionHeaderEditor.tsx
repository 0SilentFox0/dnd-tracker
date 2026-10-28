"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

import { MarkerPickerDialog } from "./MarkerPickerDialog";
import { OrderButtons } from "./OrderButtons";

import { MarkerChip } from "@/components/scenario/MarkerChip";
import { SectionIcon } from "@/components/scenario/SectionIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SECTION_ICON_KEYS, SECTION_ICON_LABELS } from "@/lib/constants/scenario";
import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { ScenarioMarkerRef, ScenarioSection, SectionIconKey } from "@/types/scenario";

type Actions = { onTitle: (title: string) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void; onIcon: (icon: SectionIconKey | undefined) => void; onMarker: (marker: ScenarioMarkerRef | undefined) => void };

export function SectionHeaderEditor({ campaignId, section, actions }: { campaignId: string; section: ScenarioSection; actions: Actions }) {
  const [picking, setPicking] = useState(false);

  return (
    <h2 className="sb-sec-edit">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="toggle sb-icon-pick" aria-label={`Іконка розділу: ${section.icon ? SECTION_ICON_LABELS[section.icon] : "автоматично"}`}>
            <SectionIcon name={sectionIcon(section)} className="sb-sec-icon" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => actions.onIcon(undefined)}>Автоматично</DropdownMenuItem>
          <DropdownMenuSeparator />
          {SECTION_ICON_KEYS.map((key) => (
            <DropdownMenuItem key={key} onSelect={() => actions.onIcon(key)}>
              <SectionIcon name={key} className="size-4" /> {SECTION_ICON_LABELS[key]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <input aria-label="Назва розділу" value={section.title} maxLength={200} onChange={(e) => actions.onTitle(e.target.value)} style={{ font: "inherit", background: "transparent", color: "inherit", border: 0, flex: 1, minWidth: 0 }} />
      {section.marker ? (
        <MarkerChip campaignId={campaignId} marker={section.marker} onRemove={() => actions.onMarker(undefined)} />
      ) : (
        <button type="button" className="toggle" aria-label="Прив'язати місце до розділу" onClick={() => setPicking(true)}>
          <MapPin className="size-3.5" />
        </button>
      )}
      {picking && <MarkerPickerDialog campaignId={campaignId} open onOpenChange={setPicking} onPick={actions.onMarker} />}
      <OrderButtons
        labels={{ up: `Розділ вгору: ${section.title}`, down: `Розділ вниз: ${section.title}`, remove: `Видалити розділ: ${section.title}` }}
        onMove={actions.onMove}
        onRemove={actions.onRemove}
      />
    </h2>
  );
}
