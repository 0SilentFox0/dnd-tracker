"use client";

import { usePathname } from "next/navigation";

import { useActiveSessions } from "./useActiveSessions";

import { battleHref, pickJoinBattle } from "@/lib/utils/campaigns/join-battle";

export function useJoinBattle(): { href: string | null } {
  const pathname = usePathname();

  const { data } = useActiveSessions();

  const target = pickJoinBattle(data?.battles ?? [], pathname);

  return { href: target ? battleHref(target) : null };
}
