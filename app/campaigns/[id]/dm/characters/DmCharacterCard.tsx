"use client";

import Link from "next/link";
import { MoreVertical, Pencil, Trash2, TrendingUp } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CharacterType } from "@/lib/constants/characters";
import { cn } from "@/lib/utils";
import { heroBaseHp } from "@/lib/utils/characters/hero-hp";
import type { Character } from "@/types/characters";

interface DmCharacterCardProps {
  character: Character;
  campaignId: string;
  busy: boolean;
  actions: { onLevelUp?: () => void; onDelete: () => void };
}

function StatChip({ short, value }: { short: string; value: string | number }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-[#4a3c2c] bg-[#1c1610] px-1 py-1 text-center">
      <b className="block truncate text-base leading-5 text-[#efe5d2]">{value}</b>
      <span className="text-[10px] uppercase text-[#8f8473]">{short}</span>
    </div>
  );
}

export function DmCharacterCard({ character, campaignId, busy, actions }: DmCharacterCardProps) {
  const isNpc = character.type === CharacterType.NPC_HERO;

  return (
    <HudCard className="space-y-3 p-3">
      <div className="flex items-start gap-3">
        <EntityIcon src={character.avatar} name={character.name} size={56} className="hud-sc size-14 shrink-0 rounded-full border-2 border-[#c9b37a] bg-[#2a2016] text-2xl text-inherit" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="hud-sc truncate text-lg leading-6 text-[#efe5d2]">{character.name}</p>
          <p className="truncate text-xs text-[#8f8473]">
            {character.race}
            {character.subrace ? ` (${character.subrace})` : ""} · {character.class}
          </p>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn("metal-fill shrink-0 rounded-full px-2 text-[11px] font-semibold", isNpc ? "metal-silver" : "metal-gold")}>
              {isNpc ? "NPC герой" : "Гравець"}
            </span>
            {!isNpc && <span className="truncate text-xs text-[#8f8473]">{character.user?.displayName || "Не призначено"}</span>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-[#c9b37a] hover:bg-transparent hover:text-[#e6c25a]"
              aria-label="Дії персонажа"
              onClick={(e) => e.preventDefault()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/campaigns/${campaignId}/dm/characters/${character.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Редагувати
              </Link>
            </DropdownMenuItem>
            {actions.onLevelUp && (
              <DropdownMenuItem onClick={actions.onLevelUp} disabled={busy}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Підняти рівень
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={actions.onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex gap-1.5">
        <StatChip short="Рів" value={character.level} />
        <StatChip short="HP" value={heroBaseHp(character).total} />
        <StatChip short="AC" value={character.armorClass} />
        <StatChip short="Ініц" value={character.initiative} />
        <StatChip short="XP" value={character.experience} />
      </div>
    </HudCard>
  );
}
