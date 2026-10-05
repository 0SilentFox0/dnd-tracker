import { useQuery } from "@tanstack/react-query";

import { getActiveBattles } from "@/lib/api/campaigns";

/** Polling every 2 min without focus refetch: freshness vs Supabase egress. */
export function useActiveBattles() {
  return useQuery({
    queryKey: ["active-battles"],
    queryFn: getActiveBattles,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
  });
}
