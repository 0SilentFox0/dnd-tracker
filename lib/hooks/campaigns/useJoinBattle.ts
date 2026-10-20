"use client";

import { usePathname } from "next/navigation";

import { useActiveBattles } from "./useActiveBattles";

import { battleHref, pickJoinBattle } from "@/lib/utils/campaigns/join-battle";

export function useJoinBattle(): { href: string | null } {
  const pathname = usePathname();

  const { data } = useActiveBattles();

  const target = pickJoinBattle(data?.battles ?? [], pathname);

  return { href: target ? battleHref(target) : null };
}
