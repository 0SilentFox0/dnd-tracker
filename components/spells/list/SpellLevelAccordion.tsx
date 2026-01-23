"use client";

import * as React from "react";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { SpellCard } from "@/components/spells/list/SpellCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteSpellsByLevel } from "@/lib/hooks/useSpells";
import type { Spell, SpellGroup } from "@/types/spells";


interface SpellLevelAccordionProps {
  levelName: string;
  level: number;
  spells: Spell[];
  campaignId: string;
  spellGroups: SpellGroup[];
  onRemoveSpellFromGroup: (spellId: string) => void;
  onMoveSpellToGroup: (spellId: string, groupId: string | null) => void;
}

export function SpellLevelAccordion({
  levelName,
  level,
  spells,
  campaignId,
  spellGroups,
  onRemoveSpellFromGroup,
  onMoveSpellToGroup,
}: SpellLevelAccordionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteSpellsByLevelMutation = useDeleteSpellsByLevel(campaignId);

  const handleDelete = () => {
    deleteSpellsByLevelMutation.mutate(level, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
      },
    });
  };

  return (
    <>
      <AccordionItem value={levelName} key={levelName}>
        <div className="relative">
          <AccordionTrigger className="px-3 sm:px-5 pr-12 sm:pr-14">
            <div className="flex items-center justify-between w-full min-w-0 gap-2 sm:gap-3">
              <span className="font-medium text-sm sm:text-base truncate">
                {levelName}
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
                onClick={() => setDeleteDialogOpen(true)}
                title="Видалити всі заклинання рівня"
              >
                <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
          )}
        </div>
        <AccordionContent>
          <div className="grid gap-2 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {spells.map((spell) => (
              <SpellCard
                key={spell.id}
                spell={spell}
                campaignId={campaignId}
                spellGroups={spellGroups}
                onRemoveFromGroup={onRemoveSpellFromGroup}
                onMoveToGroup={onMoveSpellToGroup}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Видалити всі заклинання рівня?</DialogTitle>
            <DialogDescription>
              Ви впевнені, що хочете видалити всі заклинання рівня &quot;
              {levelName}&quot;? Ця дія незворотна. Буде видалено {spells.length}{" "}
              заклинань.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteSpellsByLevelMutation.isPending}
            >
              Скасувати
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteSpellsByLevelMutation.isPending}
            >
              {deleteSpellsByLevelMutation.isPending
                ? "Видалення..."
                : "Видалити всі заклинання рівня"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
