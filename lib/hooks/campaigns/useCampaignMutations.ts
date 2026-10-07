"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { campaignKeys } from "./keys";

import { createCampaign, deleteCampaign, joinCampaign, removeCampaignMember, updateCampaign } from "@/lib/api/campaigns";

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
      void queryClient.invalidateQueries({ queryKey: campaignKeys.members(campaignId) });
      router.refresh();
    },
  });
}

export function useDeleteCampaign(campaignId: string) {
  const router = useRouter();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteCampaign(campaignId),
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey.includes(campaignId) });
      router.push("/campaigns");
      router.refresh();
    },
  });
}
