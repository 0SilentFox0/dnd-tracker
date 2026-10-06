"use client";

import Link from "next/link";
import { Trash2, Users } from "lucide-react";

import { DmCharacterCard } from "./DmCharacterCard";

import { EmptyState, LoadingState, QueryState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { useDmCharactersPage } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";

const TABS: { type?: CharacterTypeValue; label: string }[] = [
  { label: "Усі" },
  { type: CharacterType.PLAYER, label: "Гравці" },
  { type: CharacterType.NPC_HERO, label: "NPC-герої" },
];

interface DMCharactersClientProps {
  campaignId: string;
  type?: CharacterTypeValue;
}

export function DMCharactersClient({ campaignId, type }: DMCharactersClientProps) {
  const page = useDmCharactersPage(campaignId, type);

  const characterCount = page.query.data?.length ?? 0;

  const base = `/campaigns/${campaignId}/dm/characters`;

  const newHref = type ? `${base}/new?type=${type}` : `${base}/new`;

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
          <Link href={newHref}>
            <Button className="whitespace-nowrap w-full md:w-auto">
              + Створити персонажа
            </Button>
          </Link>
        </div>
      </div>

      <nav aria-label="Тип персонажів" className="flex w-fit gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.label}
            href={t.type ? `${base}?type=${t.type}` : base}
            aria-current={t.type === type ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5 text-sm", t.type === type ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <QueryState
        query={page.query}
        loading={<LoadingState rows={6} label="Завантаження персонажів…" />}
        empty={
        <EmptyState
          icon={Users}
          title="Ще немає персонажів"
          description="Гравці або NPC-герої з'являться тут."
          action={
            <Link href={newHref}>
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
