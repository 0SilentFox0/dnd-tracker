import { useQuery } from "@tanstack/react-query";

import { getActiveBattles } from "@/lib/api/campaigns";
import { battleKeys } from "@/lib/hooks/battles/keys";

/** Polling every 2 min without focus refetch: freshness vs Supabase egress. */
export function useActiveBattles() {
  return useQuery({
    queryKey: battleKeys.active(),
    queryFn: getActiveBattles,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
  });
}
