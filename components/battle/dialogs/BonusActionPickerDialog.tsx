"use client";

import Image from "next/image";
import { Zap } from "lucide-react";

import { BattleDialog } from "@/components/battle/dialogs/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { describeEffect } from "@/lib/utils/abilities";
import type { ResolvedAbility } from "@/types/abilities";

interface BonusActionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abilities: ResolvedAbility[];
  onSelect: (ability: ResolvedAbility) => void;
}

export function BonusActionPickerDialog({
  open,
  onOpenChange,
  abilities,
  onSelect,
}: BonusActionPickerDialogProps) {
  const handleSelect = (ability: ResolvedAbility) => {
    onSelect(ability);
    onOpenChange(false);
  };

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="⚡ Бонусна дія"
      description="Оберіть вміння для бонусної дії"
      contentClassName="max-w-lg"
    >
      <div className="space-y-2">
        {abilities.map((ability) => {
          const icon = ability.source.icon;

          const description = ability.description ?? ability.effects.map(describeEffect).join(", ");

          return (
          <Button
            key={ability.key}
            variant="outline"
            className={cn(
              "w-full h-auto min-h-[56px] flex items-center gap-3 justify-start px-4 py-3",
              "hover:bg-yellow-500/10 hover:border-yellow-500/50",
            )}
            onClick={() => handleSelect(ability)}
          >
            {icon ? (
              <Image
                src={icon}
                alt={ability.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="h-10 w-10 rounded bg-yellow-500/20 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
            )}
            <div className="flex flex-col items-start text-left min-w-0">
              <span className="font-bold truncate w-full">{ability.name}</span>
              {description && (
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {description}
                </span>
              )}
            </div>
          </Button>
          );
        })}
      </div>
    </BattleDialog>
  );
}
