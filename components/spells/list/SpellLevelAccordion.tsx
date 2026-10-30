"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { spellLevelMetal } from "@/components/hud";
import { SpellCard } from "@/components/spells/list/SpellCard";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/lib/hooks/common";
import { useDeleteSpellsByLevel } from "@/lib/hooks/spells";
import { useTranslator } from "@/lib/i18n/use-translator";
import { cn } from "@/lib/utils";
import type { Spell, SpellGroup } from "@/types/spells";


export interface SpellGroupItemActions {
  onRemoveFromGroup: (spellId: string) => void;
  onMoveToGroup: (spellId: string, groupId: string | null) => void;
}

interface SpellLevelAccordionProps {
  level: number;
  spells: Spell[];
  campaignId: string;
  spellGroups: SpellGroup[];
  actions: SpellGroupItemActions;
}

export function SpellLevelAccordion({
  level,
  spells,
  campaignId,
  spellGroups,
  actions,
}: SpellLevelAccordionProps) {
  const t = useTranslations("spells.list");

  const ta = useTranslations("common.actions");

  const tg = useTranslator("gameTerms");

  const levelLabel = tg(`spellLevels.${level}`);

  const confirm = useConfirm();

  const deleteSpellsByLevelMutation = useDeleteSpellsByLevel(campaignId);

  const handleDelete = () =>
    confirm({
      title: t("deleteLevel.title"),
      description: t("deleteLevel.description", { level: levelLabel, count: spells.length }),
      confirmLabel: ta("delete"),
      destructive: true,
      onConfirm: () => deleteSpellsByLevelMutation.mutateAsync(level),
    });

  return (
    <>
      <AccordionItem value={String(level)}>
        <div className="relative">
          <AccordionTrigger className="px-3 sm:px-5 pr-12 sm:pr-14">
            <div className="flex items-center justify-between w-full min-w-0 gap-2 sm:gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <span aria-hidden className={cn("metal-fill flex size-6 shrink-0 rotate-45 items-center justify-center rounded-[3px]", spellLevelMetal(level))}>
                  <span className="-rotate-45 text-[11px] font-semibold">{level}</span>
                </span>
                <span className="font-medium text-sm sm:text-base truncate">{levelLabel}</span>
              </span>
              <Badge variant="secondary" className="ml-2 shrink-0">
                {spells.length}
              </Badge>
            </div>
          </AccordionTrigger>
          {spells.length > 0 && (
            <div
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 sm:h-12 sm:w-12"
                onClick={() => void handleDelete()}
                title={t("deleteLevel.tooltip")}
              >
                <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
          )}
        </div>
        <AccordionContent>
          <div className="grid auto-rows-fr grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {spells.map((spell) => (
              <SpellCard
                key={spell.id}
                spell={spell}
                campaignId={campaignId}
                spellGroups={spellGroups}
                onRemoveFromGroup={actions.onRemoveFromGroup}
                onMoveToGroup={actions.onMoveToGroup}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

    </>
  );
}
