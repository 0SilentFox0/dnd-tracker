"use client";

import Link from "next/link";
import { Trash2, Users } from "lucide-react";

import { DmCharacterCard } from "./DmCharacterCard";

import { EmptyState, LoadingState, QueryState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useDmCharactersPage } from "@/lib/hooks/characters";

interface DMCharactersClientProps {
  campaignId: string;
}

export function DMCharactersClient({ campaignId }: DMCharactersClientProps) {
  const page = useDmCharactersPage(campaignId);

  const characterCount = page.query.data?.length ?? 0;

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
          {characterCount > 0 && (
            <Button
              variant="destructive"
              className="whitespace-nowrap"
              onClick={() => void page.confirmDeleteAll()}
              disabled={page.isDeletingAll}
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

      <QueryState
        query={page.query}
        loading={<LoadingState rows={6} label="Завантаження персонажів…" />}
        empty={
        <EmptyState
          icon={Users}
          title="Ще немає персонажів"
          description="Гравці або NPC-герої з'являться тут."
          action={
            <Link href={`/campaigns/${campaignId}/dm/characters/new`}>
              <Button>Створити першого персонажа</Button>
            </Link>
          }
        />
        }
      >
        {(characters) => (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((character) => (
              <DmCharacterCard
                key={character.id}
                character={character}
                campaignId={campaignId}
                busy={page.levelingUpId === character.id}
                actions={{ onLevelUp: () => page.levelUp(character), onDelete: () => void page.confirmDelete(character) }}
              />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
