import { useQuery } from "@tanstack/react-query";

import { getActiveSessions } from "@/lib/api/campaigns";
import { battleKeys } from "@/lib/hooks/battles/keys";

/** Polling every 2 min without focus refetch: freshness vs Supabase egress. */
export function useActiveSessions() {
  return useQuery({
    queryKey: battleKeys.active(),
    queryFn: getActiveSessions,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
  });
}
