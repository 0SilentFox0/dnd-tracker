"use client";

import { usePathname } from "next/navigation";

import { useActiveSessions } from "./useActiveSessions";

import { pickWatchShow, showHref } from "@/lib/utils/campaigns/watch-show";

export function useWatchShow(): { href: string | null } {
  const pathname = usePathname();

  const { data } = useActiveSessions();

  const target = pickWatchShow(data?.shows ?? [], pathname);

  return { href: target ? showHref(target) : null };
}
