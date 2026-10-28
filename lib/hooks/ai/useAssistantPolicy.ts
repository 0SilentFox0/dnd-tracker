"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { aiKeys } from "./keys";

import { setAssistantPolicy } from "@/lib/api/assistant";
export function useAssistantPolicy(campaignId: string) {
 const client = useQueryClient();

 return useMutation({mutationFn:(body:Parameters<typeof setAssistantPolicy>[1])=>setAssistantPolicy(campaignId,body),onSuccess:async()=>{ await Promise.all([client.invalidateQueries({queryKey:["ai-threads",campaignId]}),client.invalidateQueries({queryKey:aiKeys.apiTokens(campaignId)})]); }});
}
