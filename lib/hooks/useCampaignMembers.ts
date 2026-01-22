/**
 * Хук для отримання учасників кампанії
 */

import { useState, useEffect } from "react";
import { getCampaignMembers } from "@/lib/api/campaigns";
import type { CampaignMember } from "@/types/campaigns";

export function useCampaignMembers(campaignId: string) {
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCampaignMembers(campaignId);
        setMembers(data);
      } catch (err) {
        setError((err as Error).message);
        console.error("Error fetching campaign members:", err);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchMembers();
    }
  }, [campaignId]);

  return { members, loading, error };
}
