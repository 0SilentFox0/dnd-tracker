"use client";

import { usePathname } from "next/navigation";

import { useActiveBattles } from "./useActiveBattles";

import { pickWatchShow, showHref } from "@/lib/utils/campaigns/watch-show";

export function useWatchShow(): { href: string | null } {
  const pathname = usePathname();

  const { data } = useActiveBattles();

  const target = pickWatchShow(data?.shows ?? [], pathname);

  return { href: target ? showHref(target.campaignId) : null };
}
