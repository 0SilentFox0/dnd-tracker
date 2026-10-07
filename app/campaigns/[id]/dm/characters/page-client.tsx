"use client";

import Link from "next/link";
import { Trash2, Users } from "lucide-react";

import { DmCharacterCard } from "./DmCharacterCard";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { EmptyState, LoadingState, QueryState } from "@/components/common/states";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { CharacterType, type CharacterTypeValue } from "@/lib/constants/characters";
import { useDmCharactersPage } from "@/lib/hooks/characters";

const TABS: { type?: CharacterTypeValue; label: string }[] = [
  { label: "Усі" },
  { type: CharacterType.PLAYER, label: "Гравці" },
  { type: CharacterType.NPC_HERO, label: "NPC-герої" },
];

interface DMCharactersClientProps {
  campaignId: string;
  type?: CharacterTypeValue;
  maxLevel: number;
}

export function DMCharactersClient({ campaignId, type, maxLevel }: DMCharactersClientProps) {
  const page = useDmCharactersPage(campaignId, type);

  const characterCount = page.query.data?.length ?? 0;

  const base = `/campaigns/${campaignId}/dm/characters`;

  const newHref = type ? `${base}/new?type=${type}` : `${base}/new`;

  return (
    <HudPage>
      <HudPageHeader
        title="Персонажі кампанії"
        subtitle="Гравці та NPC герої"
        actions={
          <>
            <DeleteAllButton
              count={characterCount}
              nouns={["персонаж", "персонажі", "персонажів"]}
              title="Видалити всіх персонажів?"
              label="Видалити всіх"
              description="Буде видалено всіх персонажів гравців у цій кампанії. Цю дію не можна скасувати."
              icon={<Trash2 className="mr-2 h-4 w-4" />}
              pending={page.isDeletingAll}
              onConfirm={page.removeAll}
            />
            <Link href={newHref}>
              <Button className="whitespace-nowrap">
                + Створити персонажа
              </Button>
            </Link>
          </>
        }
      >
        <HudChipTabs
          ariaLabel="Тип персонажів"
          items={TABS.map((t) => ({
            key: t.label,
            label: t.label,
            href: t.type ? `${base}?type=${t.type}` : base,
            active: t.type === type,
          }))}
        />
      </HudPageHeader>

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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((character) => (
              <DmCharacterCard
                key={character.id}
                character={character}
                campaignId={campaignId}
                busy={page.levelingUpId === character.id}
                actions={{ onLevelUp: character.level < maxLevel ? () => page.levelUp(character) : undefined, onDelete: () => void page.confirmDelete(character) }}
              />
            ))}
          </div>
        )}
      </QueryState>
    </HudPage>
  );
}
