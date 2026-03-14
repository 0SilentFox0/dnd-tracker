"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { SpellRichOptionData } from "@/components/spells/SpellRichOption";
import { SpellRichOption } from "@/components/spells/SpellRichOption";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSpellTypeIcon } from "@/lib/utils/spells/spell-icons";

export interface SpellSelectDropdownProps {
  /** Групи заклинань: назва групи -> масив заклинань */
  groupedSpells: Map<string, SpellRichOptionData[]>;
  value: string;
  onValueChange: (spellId: string, spell: SpellRichOptionData | null) => void;
  /** Чи недоступне заклинання (наприклад немає слотів) */
  getIsDisabled?: (spell: SpellRichOptionData) => boolean;
  placeholder?: string;
  /** Слоти по рівнях для підпису (наприклад "2/3") */
  getSlotLabel?: (spell: SpellRichOptionData) => string | undefined;
  triggerClassName?: string;
  contentClassName?: string;
}

export function SpellSelectDropdown({
  groupedSpells,
  value,
  onValueChange,
  getIsDisabled,
  placeholder = "Оберіть заклинання",
  getSlotLabel,
  triggerClassName,
  contentClassName,
}: SpellSelectDropdownProps) {
  const [open, setOpen] = useState(false);

  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set());

  const selectedSpell = (() => {
    for (const groupSpells of groupedSpells.values()) {
      const found = groupSpells.find((s) => s.id === value);

      if (found) return found;
    }

    return null;
  })();

  const handleIconError = (spellId: string) => {
    setIconErrors((prev) => new Set(prev).add(spellId));
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "h-auto min-h-9 w-full justify-between gap-2 font-normal",
            triggerClassName,
          )}
        >
          {selectedSpell ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded border bg-muted">
                {selectedSpell.icon && !iconErrors.has(selectedSpell.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external spell icon
                  <img
                    src={selectedSpell.icon}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => handleIconError(selectedSpell.id)}
                  />
                ) : (
                  (() => {
                    const TypeIcon = getSpellTypeIcon(selectedSpell.type);

                    return (
                      <TypeIcon className="text-muted-foreground m-auto h-4 w-4" />
                    );
                  })()
                )}
              </div>
              <span className="truncate">{selectedSpell.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                рів. {selectedSpell.level}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn(
          "w-[min(420px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto p-1 pb-3 left-[-20px]",
          contentClassName,
        )}
      >
        {Array.from(groupedSpells.entries()).map(([groupName, groupSpells]) => (
          <div key={groupName} className="pb-1">
            <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
              {groupName}
            </div>
            {groupSpells.map((spell) => {
              const isDisabled = getIsDisabled?.(spell) ?? false;

              return (
                <button
                  key={spell.id}
                  type="button"
                  disabled={isDisabled}
                  className={cn(
                    "w-full rounded-md text-left outline-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent/80 disabled:pointer-events-none disabled:opacity-50",
                    value === spell.id && "bg-accent/80",
                  )}
                  onClick={() => {
                    if (isDisabled) return;

                    onValueChange(spell.id, spell);
                    setOpen(false);
                  }}
                >
                  <SpellRichOption
                    spell={spell}
                    slotLabel={getSlotLabel?.(spell)}
                    disabled={isDisabled}
                    iconError={iconErrors.has(spell.id)}
                    onIconError={
                      spell.icon ? () => handleIconError(spell.id) : undefined
                    }
                  />
                </button>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
