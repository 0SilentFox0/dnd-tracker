"use client";

import { OrderButtons } from "./OrderButtons";

import { SectionIcon } from "@/components/scenario/SectionIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SECTION_ICON_KEYS, SECTION_ICON_LABELS } from "@/lib/constants/scenario";
import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { ScenarioSection, SectionIconKey } from "@/types/scenario";

type Actions = { onTitle: (title: string) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void; onIcon: (icon: SectionIconKey | undefined) => void };

export function SectionHeaderEditor({ section, actions }: { section: ScenarioSection; actions: Actions }) {
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
      <OrderButtons
        labels={{ up: `Розділ вгору: ${section.title}`, down: `Розділ вниз: ${section.title}`, remove: `Видалити розділ: ${section.title}` }}
        onMove={actions.onMove}
        onRemove={actions.onRemove}
      />
    </h2>
  );
}
