"use client";

import { Edit, MoreVertical, X } from "lucide-react";

import { SkillCard } from "@/components/skills/list/SkillCard";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSkillId } from "@/lib/utils/skills/skill-helpers";
import type { GroupedSkill, Skill } from "@/types/skills";

export interface SkillGroupAccordionItemProps {
  groupName: string;
  /** Колір фону (наприклад rgba з hexToRgba) */
  accordionBg?: string;
  totalSkills: number;
  isUngrouped: boolean;
  groupId: string | undefined;
  onRenameClick: () => void;
  onRemoveAllClick: () => void;
  /** Викликається при видаленні одного скіла (DM) */
  onDeleteSkill?: (skillId: string) => void;
  /** Викликається при дублюванні скіла (DM) */
  onDuplicateSkill?: (skillId: string) => void;
  skills: (Skill | GroupedSkill)[];
  campaignId: string;
}

export function SkillGroupAccordionItem({
  groupName,
  accordionBg,
  totalSkills,
  isUngrouped,
  groupId,
  onRenameClick,
  onRemoveAllClick,
  onDeleteSkill,
  onDuplicateSkill,
  skills,
  campaignId,
}: SkillGroupAccordionItemProps) {
  return (
    <AccordionItem
      value={groupName}
      key={groupName}
      className="rounded-lg overflow-hidden"
      style={accordionBg ? { backgroundColor: accordionBg } : undefined}
    >
      <div className="relative">
        <AccordionTrigger className="px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4 text-left w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{groupName}</CardTitle>
              <CardDescription className="mt-1">
                {totalSkills} скілів
              </CardDescription>
            </div>
          </div>
        </AccordionTrigger>
        {!isUngrouped && groupId && (
          <div
            className="absolute right-12 sm:right-14 top-1/2 -translate-y-1/2 z-10"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-12 sm:w-12"
                >
                  <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameClick();
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Перейменувати групу
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAllClick();
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Видалити всі скіли з групи
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <AccordionContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 px-4 sm:px-6 pb-4">
          {skills.map((skill) => (
            <SkillCard
              key={getSkillId(skill)}
              skill={skill}
              campaignId={campaignId}
              onRemove={onDeleteSkill}
              onDuplicate={onDuplicateSkill}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
