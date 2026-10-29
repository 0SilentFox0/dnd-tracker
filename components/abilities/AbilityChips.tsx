"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Ability } from "@/lib/utils/abilities/schema";

export function pickAfterRemove(ids: string[], removedIndex: number): string | null {
  return ids[removedIndex + 1] ?? ids[removedIndex - 1] ?? null;
}

interface AbilityChipsProps {
  abilities: Ability[];
  selectedId: string | null;
  invalidIds: Set<string>;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function AbilityChips({ abilities, selectedId, invalidIds, onSelect, onAdd }: AbilityChipsProps) {
  const t = useTranslations("abilities.chips");

  return (
    <div className="hud-scroll-x -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1" role="tablist" aria-label={t("aria")}>
      {abilities.map((a) => {
        const on = a.id === selectedId;

        return (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(a.id)}
            className={cn(
              "flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-line)]",
              on && "text-[#ffd9a8] shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong),0_0_8px_rgba(230,194,90,.3)]",
            )}
          >
            <span className="max-w-[10rem] truncate">{a.name || t("noName")}</span>
            {invalidIds.has(a.id) && <span data-invalid-dot aria-label={t("hasErrors")} className="ml-1.5 h-1.5 w-1.5 rounded-full bg-hud-danger" />}
          </button>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        onClick={onAdd}
        className="h-8 shrink-0 rounded-full px-3 text-[13px] text-[#ffd9a8] shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong)] hover:bg-transparent hover:text-[#ffd9a8]"
      >
        {t("add")}
      </Button>
    </div>
  );
}
