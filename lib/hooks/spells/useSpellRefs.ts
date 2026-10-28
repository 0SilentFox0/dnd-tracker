"use client";

import { useQuery } from "@tanstack/react-query";

import { spellKeys } from "./keys";

import { getSpellRefs } from "@/lib/api/spells";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { SpellRef } from "@/types/choices";

export function useSpellRefs(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery<SpellRef[]>({
    queryKey: spellKeys.refs(campaignId),
    queryFn: () => getSpellRefs(campaignId),
    staleTime: REFERENCE_STALE_MS,
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}
