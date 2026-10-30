"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { localeKeys } from "./keys";

import { localeApi } from "@/lib/api/locale";
import { useBrowserTimeZone } from "@/lib/i18n/use-time-zone-cookie";

export function useTimeZoneSetting(): { timeZone: string | null; browserZone: string; set: (next: string | null) => Promise<void> } {
  const router = useRouter();

  const queryClient = useQueryClient();

  const browserZone = useBrowserTimeZone();

  const { data } = useQuery({ queryKey: localeKeys.all, queryFn: localeApi.get });

  const set = useCallback(
    async (next: string | null) => {
      await localeApi.set({ timeZone: next });
      await queryClient.invalidateQueries({ queryKey: localeKeys.all });
      router.refresh();
    },
    [queryClient, router],
  );

  return { timeZone: data?.timeZone ?? null, browserZone, set };
}
