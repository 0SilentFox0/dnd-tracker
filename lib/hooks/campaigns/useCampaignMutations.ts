"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCampaign, joinCampaign, removeCampaignMember, updateCampaign } from "@/lib/api/campaigns";

export function useCreateCampaign() {
  return useMutation({ mutationFn: createCampaign });
}

export function useJoinCampaign() {
  return useMutation({ mutationFn: (inviteCode: string) => joinCampaign(inviteCode) });
}

export function useUpdateCampaign(campaignId: string) {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: Parameters<typeof updateCampaign>[1]) => updateCampaign(campaignId, data),
    onSuccess: () => router.refresh(),
  });
}

export function useRemoveCampaignMember(campaignId: string) {
  const router = useRouter();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeCampaignMember(campaignId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaign-members", campaignId] });
      router.refresh();
    },
  });
}
