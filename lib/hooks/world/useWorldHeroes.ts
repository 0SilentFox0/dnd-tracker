"use client";

import { useCharacters } from "@/lib/hooks/characters";
import type { WorldHero } from "@/types/world";

export type RosterHero = Pick<WorldHero, "id" | "name" | "avatar">;

export function useWorldHeroes(campaignId: string, enabled = true) {
  const query = useCharacters(campaignId, { type: "player", compact: true, enabled });

  const heroes: RosterHero[] = (query.data ?? []).map((c) => ({ id: c.id, name: c.name, avatar: c.avatar ?? null }));

  return { heroes, isPending: query.isPending };
}
