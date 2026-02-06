"use client";

import { useState } from "react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCharacters,
  useDeleteAllCharacters,
  useDeleteCharacter,
} from "@/lib/hooks/useCharacters";
import type { Character } from "@/types/characters";
import { Trash2 } from "lucide-react";

interface DMCharactersClientProps {
  campaignId: string;
}

export function DMCharactersClient({ campaignId }: DMCharactersClientProps) {
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(
    null
  );

  const { data: characters = [], isLoading } = useCharacters(campaignId);
  const deleteAllMutation = useDeleteAllCharacters(campaignId);
  const deleteOneMutation = useDeleteCharacter(campaignId);

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
          <h1 className="text-3xl font-bold">Персонажі Гравців</h1>
          <p className="text-muted-foreground mt-1">
            Управління персонажами гравців кампанії
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
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={character.avatar || undefined} />
                      <AvatarFallback>
                        {character.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{character.name}</CardTitle>
                      <CardDescription>
                        {character.user?.displayName || "Не призначено"}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setCharacterToDelete(character)}
                    disabled={deleteOneMutation.isPending}
                    title="Видалити персонажа"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {character.race} {character.subrace || ""}
                  </Badge>
                  <Badge variant="outline">{character.class}</Badge>
                  <Badge variant="default">Рівень {character.level}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">HP:</span>{" "}
                    <span className="font-semibold">
                      {character.currentHp}/{character.maxHp}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">XP:</span>{" "}
                    <span className="font-semibold">{character.experience}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">AC:</span>{" "}
                    <span className="font-semibold">{character.armorClass}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Initiative:</span>{" "}
                    <span className="font-semibold">{character.initiative}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/campaigns/${campaignId}/dm/characters/${character.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full" size="sm">
                      Редагувати
                    </Button>
                  </Link>
                  <Link
                    href={`/campaigns/${campaignId}/dm/characters/${character.id}/inventory`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full" size="sm">
                      Інвентар
                    </Button>
                  </Link>
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
              Поки немає персонажів гравців
            </p>
            <Link href={`/campaigns/${campaignId}/dm/characters/new`}>
              <Button>Створити першого персонажа</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити всіх персонажів?</AlertDialogTitle>
            <AlertDialogDescription>
              Буде видалено всіх персонажів гравців у цій кампанії. Цю дію не
              можна скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAllMutation.isPending ? "Видалення…" : "Видалити всіх"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!characterToDelete}
        onOpenChange={(open) => !open && setCharacterToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити персонажа?</AlertDialogTitle>
            <AlertDialogDescription>
              Персонажа &quot;{characterToDelete?.name}&quot; буде видалено. Цю
              дію не можна скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOne}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOneMutation.isPending ? "Видалення…" : "Видалити"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
