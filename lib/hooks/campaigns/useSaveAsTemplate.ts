"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { campaignKeys } from "./keys";

import { saveAsTemplate } from "@/lib/api/templates";

export function useSaveAsTemplate(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => saveAsTemplate(campaignId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignKeys.templates() }),
  });
}
