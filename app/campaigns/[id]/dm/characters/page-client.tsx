"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Trash2, TrendingUp } from "lucide-react";

import { DeleteAllCharactersDialog } from "./__dialogs__/DeleteAllCharactersDialog";
import { DeleteCharacterDialog } from "./__dialogs__/DeleteCharacterDialog";

import { OptimizedImage } from "@/components/common/OptimizedImage";
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
import { getHeroMaxHp } from "@/lib/constants/hero-scaling";
import {
  useCharacters,
  useDeleteAllCharacters,
  useDeleteCharacter,
  useLevelUpCharacter,
} from "@/lib/hooks/characters";
import type { Character } from "@/types/characters";

interface DMCharactersClientProps {
  campaignId: string;
}

export function DMCharactersClient({ campaignId }: DMCharactersClientProps) {
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(
    null,
  );

  const { data: characters = [], isLoading } = useCharacters(campaignId);

  const deleteAllMutation = useDeleteAllCharacters(campaignId);

  const deleteOneMutation = useDeleteCharacter(campaignId);

  const levelUpMutation = useLevelUpCharacter(campaignId);

  const handleLevelUp = async (character: Character) => {
    try {
      await levelUpMutation.mutateAsync(character.id);
    } catch (error) {
      console.error("Error leveling up:", error);
      alert("Не вдалося підняти рівень. Спробуйте ще раз.");
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllMutation.mutateAsync();
      setDeleteAllOpen(false);
    } catch (error) {
      console.error("Error deleting all characters:", error);
      alert("Не вдалося видалити всіх персонажів. Спробуйте ще раз.");
    }
  };

  const handleDeleteOne = async () => {
    if (!characterToDelete) return;

    try {
      await deleteOneMutation.mutateAsync(characterToDelete.id);
      setCharacterToDelete(null);
    } catch (error) {
      console.error("Error deleting character:", error);
      alert("Не вдалося видалити персонажа. Спробуйте ще раз.");
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">Персонажі кампанії</h1>
          <p className="text-muted-foreground mt-1">
            Гравці та NPC герої
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {characters.length > 0 && (
            <Button
              variant="destructive"
              className="whitespace-nowrap"
              onClick={() => setDeleteAllOpen(true)}
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Видалити всіх
            </Button>
          )}
          <Link href={`/campaigns/${campaignId}/dm/characters/new`}>
            <Button className="whitespace-nowrap w-full md:w-auto">
              + Створити персонажа
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Завантаження...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <Card
              key={character.id}
              className="overflow-hidden hover:shadow-lg transition-shadow pt-0"
            >
              <div className="relative aspect-square h-full w-full bg-muted">
                {character.avatar ? (
                  <>
                    <OptimizedImage
                      src={character.avatar}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      width={100}
                      height={100}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground">
                    {character.name.charAt(0).toUpperCase()}
                  </div>
                )}
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
                      onClick={() => handleLevelUp(character)}
                      disabled={levelUpMutation.isPending}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Підняти рівень
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setCharacterToDelete(character)}
                      disabled={deleteOneMutation.isPending}
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
                    HP {getHeroMaxHp(character.level, character.strength, {
                    hpMultiplier: (character as { hpMultiplier?: number | null }).hpMultiplier ?? 1,
                  })}
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
          ))}
        </div>
      )}

      {!isLoading && characters.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Поки немає персонажів (гравців або NPC героїв)
            </p>
            <Link href={`/campaigns/${campaignId}/dm/characters/new`}>
              <Button>Створити першого персонажа</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <DeleteAllCharactersDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
        onConfirm={handleDeleteAll}
        isPending={deleteAllMutation.isPending}
      />

      <DeleteCharacterDialog
        character={characterToDelete}
        onClose={() => setCharacterToDelete(null)}
        onConfirm={handleDeleteOne}
        isPending={deleteOneMutation.isPending}
      />
    </div>
  );
}
