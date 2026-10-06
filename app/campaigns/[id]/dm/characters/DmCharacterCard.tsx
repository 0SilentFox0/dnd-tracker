"use client";

import Link from "next/link";
import { MoreVertical, Pencil, Trash2, TrendingUp } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { heroBaseHp } from "@/lib/utils/characters/hero-hp";
import type { Character } from "@/types/characters";

interface DmCharacterCardProps {
  character: Character;
  campaignId: string;
  busy: boolean;
  actions: { onLevelUp: () => void; onDelete: () => void };
}

export function DmCharacterCard({ character, campaignId, busy, actions }: DmCharacterCardProps) {
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow pt-0"
    >
      <div className="relative aspect-square h-full w-full bg-muted">
        <EntityIcon src={character.avatar} name={character.name} size={100} className="absolute inset-0 size-full rounded-none text-4xl font-bold" />
        {character.avatar && <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md bg-black/40 hover:bg-black/60 text-white border-0"
              onClick={(e) => e.preventDefault()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link
                href={`/campaigns/${campaignId}/dm/characters/${character.id}`}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Редагувати
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={actions.onLevelUp}
              disabled={busy}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Підняти рівень
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={actions.onDelete}
                          >
              <Trash2 className="mr-2 h-4 w-4" />
              Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardContent className="p-3 space-y-2">
        <div>
          <p className="font-semibold text-lg leading-tight truncate">
            {character.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {character.type === "npc_hero"
              ? "NPC герой"
              : character.user?.displayName || "Не призначено"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={
              character.type === "npc_hero" ? "secondary" : "outline"
            }
            className="text-xs"
          >
            {character.type === "npc_hero" ? "NPC герой" : "Гравець"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {character.race}
            {character.subrace ? ` (${character.subrace})` : ""}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {character.class}
          </Badge>
          <Badge variant="default" className="text-xs">
            Рівень {character.level}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            HP {heroBaseHp(character).total}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            AC {character.armorClass}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Init {character.initiative}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            XP {character.experience}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
