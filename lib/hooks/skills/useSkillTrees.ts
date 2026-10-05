import { useQuery } from "@tanstack/react-query";

import { getSkillTrees } from "@/lib/api/skill-trees";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";

export function useSkillTrees(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["skill-trees", campaignId],
    queryFn: () => getSkillTrees(campaignId),
    staleTime: REFERENCE_STALE_MS,
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}
