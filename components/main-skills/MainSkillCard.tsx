"use client";

import Link from "next/link";
import { Edit,MoreVertical, Trash2 } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MainSkill } from "@/types/main-skills";

interface MainSkillCardProps {
  mainSkill: MainSkill;
  campaignId: string;
  onDelete: (mainSkillId: string) => void;
}

export function MainSkillCard({
  mainSkill,
  campaignId,
  onDelete,
}: MainSkillCardProps) {
  return (
    <HudCard accent={mainSkill.color} className="space-y-3">
      <div>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="hud-sc flex items-center gap-2 text-[#efe5d2]">
              <div
                className="h-4 w-4 shrink-0 rounded-full border-2 border-[#4a3c2c]"
                style={{ backgroundColor: mainSkill.color }}
              />
              {mainSkill.name}
            </h3>
            <p className="mt-2 break-all text-sm text-[#8f8473]">ID: {mainSkill.id}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/campaigns/${campaignId}/dm/main-skills/${mainSkill.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редагувати
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(mainSkill.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Видалити
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div>
        <div className="space-y-2">
          <div>
            <span className="text-sm font-semibold">Колір сегменту:</span>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="h-8 w-8 rounded border-2 border-[#4a3c2c]"
                style={{ backgroundColor: mainSkill.color }}
              />
              <span className="rounded-full px-2 text-xs text-[#e6dccb]" style={{ boxShadow: `inset 0 0 0 1px ${mainSkill.color}` }}>
                {mainSkill.color}
              </span>
            </div>
          </div>
          {mainSkill.icon && (
            <div>
              <span className="text-sm font-semibold">Іконка:</span>
              <EntityIcon src={mainSkill.icon} name={mainSkill.name} size={32} emoji className="mt-1 size-8 rounded bg-[#1a140f] text-xl text-inherit" />
            </div>
          )}
        </div>
      </div>
    </HudCard>
  );
}
