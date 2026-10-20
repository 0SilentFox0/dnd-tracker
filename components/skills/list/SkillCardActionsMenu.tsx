"use client";

import { Check, Copy, MoreVertical, Tag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MainSkill } from "@/types/main-skills";

interface SkillCardActionsMenuProps {
  currentMainSkillId: string | null;
  mainSkills: MainSkill[];
  actions: {
    onSelectMainSkill: (mainSkillId: string | null) => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
  };
}

export function SkillCardActionsMenu({ currentMainSkillId, mainSkills, actions }: SkillCardActionsMenuProps) {
  const { onSelectMainSkill, onDuplicate, onDelete } = actions;

  if (!onDelete && !onDuplicate && mainSkills.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Меню дій"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {mainSkills.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag className="h-4 w-4" />
              Обрати основний навик
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => onSelectMainSkill(null)}
              >
                <span className="inline-flex w-4 shrink-0 justify-center mr-2">
                  {currentMainSkillId === null ? (
                    <Check className="h-4 w-4" />
                  ) : null}
                </span>
                Без основного навику
              </DropdownMenuItem>
              {mainSkills
                .filter(
                  (ms) => ms.id !== "racial" && ms.id !== "ultimate",
                )
                .map((ms) => (
                  <DropdownMenuItem
                    key={ms.id}
                    onClick={() => onSelectMainSkill(ms.id)}
                  >
                    <span className="inline-flex w-4 shrink-0 justify-center mr-2">
                      {currentMainSkillId === ms.id ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                    </span>
                    <span
                      className="mr-2 size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: ms.color }}
                      aria-hidden
                    />
                    {ms.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {onDuplicate && (
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
            Копіювати
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Видалити
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
