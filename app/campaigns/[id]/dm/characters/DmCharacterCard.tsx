"use client";

import Link from "next/link";
import { MoreVertical, Pencil, Trash2, TrendingUp } from "lucide-react";

import { HeroPortrait } from "@/components/character-profile/HeroPortrait";
import { HudCard, HudPill, HudStatChip } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CharacterType } from "@/lib/constants/characters";
import { heroBaseHp } from "@/lib/utils/characters/hero-hp";
import type { CharacterListItem } from "@/types/characters";

interface DmCharacterCardProps {
  character: CharacterListItem;
  campaignId: string;
  busy: boolean;
  actions: { onLevelUp?: () => void; onDelete: () => void };
}

export function DmCharacterCard({ character, campaignId, busy, actions }: DmCharacterCardProps) {
  const isNpc = character.type === CharacterType.NPC_HERO;

  return (
    <HudCard className="space-y-3 p-3">
      <HeroPortrait src={character.avatar} name={character.name} className="max-h-72" />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="hud-sc truncate text-lg leading-6 text-hud-ink">{character.name}</p>
          <p className="truncate text-xs text-hud-muted">
            {character.race}
            {character.subrace ? ` (${character.subrace})` : ""} · {character.class}
          </p>
          <div className="flex min-w-0 items-center gap-1.5">
            <HudPill tone={isNpc ? "silver" : "gold"}>{isNpc ? "NPC герой" : "Гравець"}</HudPill>
            {!isNpc && <span className="truncate text-xs text-hud-muted">{character.user?.displayName || "Не призначено"}</span>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full text-hud-gold hover:bg-transparent hover:text-[#e6c25a]"
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
        <HudStatChip short="Рів" value={character.level} />
        <HudStatChip short="HP" value={heroBaseHp(character).total} />
        <HudStatChip short="AC" value={character.armorClass} />
        <HudStatChip short="Ініц" value={character.initiative} />
        <HudStatChip short="XP" value={character.experience} />
      </div>
    </HudCard>
  );
}
