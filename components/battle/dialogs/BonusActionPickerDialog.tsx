"use client";

import Image from "next/image";
import { Zap } from "lucide-react";

import { BattleDialog } from "@/components/battle/dialogs/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActiveSkill } from "@/types/battle";

interface BonusActionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skills: ActiveSkill[];
  onSelect: (skill: ActiveSkill) => void;
}

export function BonusActionPickerDialog({
  open,
  onOpenChange,
  skills,
  onSelect,
}: BonusActionPickerDialogProps) {
  const handleSelect = (skill: ActiveSkill) => {
    onSelect(skill);
    onOpenChange(false);
  };

  return (
    <BattleDialog
      open={open}
      onOpenChange={onOpenChange}
      title="⚡ Бонусна дія"
      description="Оберіть скіл для бонусної дії"
      contentClassName="max-w-lg"
    >
      <div className="space-y-2">
        {skills.map((skill) => (
          <Button
            key={skill.skillId}
            variant="outline"
            className={cn(
              "w-full h-auto min-h-[56px] flex items-center gap-3 justify-start px-4 py-3",
              "hover:bg-yellow-500/10 hover:border-yellow-500/50",
            )}
            onClick={() => handleSelect(skill)}
          >
            {skill.icon ? (
              <Image
                src={skill.icon}
                alt={skill.name}
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
              <span className="font-bold truncate w-full">{skill.name}</span>
              {skill.description && (
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {skill.description}
                </span>
              )}
            </div>
          </Button>
        ))}
      </div>
    </BattleDialog>
  );
}
