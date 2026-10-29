"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ASSISTANT_POLLING } from "./assistant-polling";
import { aiKeys } from "./keys";
import { flushAssistantBeforeApply, useAssistantEffects } from "./useAssistantEffects";

import { applyAiProposal, getAiProposals, rejectAiProposal } from "@/lib/api/ai";
import { confirmAssistantIntent, getAssistantIntent, getAssistantIntents, getAssistantReceipt, type IntentFilters,rejectAssistantIntent } from "@/lib/api/assistant";
import type { IntentDetail } from "@/types/assistant";

export function useAssistantIntents(campaignId: string, filters: IntentFilters & { intentId?: string } = {}) {
 const client = useQueryClient();

 const {consumeReceipt}=useAssistantEffects(campaignId);

 const query = useQuery({queryKey: aiKeys.intents(campaignId, filters.cursor, filters.limit), queryFn: () => getAssistantIntents(campaignId, { ...filters, status: "pending" }), refetchInterval: ASSISTANT_POLLING.intentsMs});

 const legacy = useQuery({queryKey:aiKeys.workspaceProposals(campaignId),queryFn:()=>getAiProposals(campaignId,{status:"pending",workspace:true})});

 const detail = useQuery({queryKey: aiKeys.intent(campaignId, filters.intentId ?? ""), queryFn: () => getAssistantIntent(campaignId, filters.intentId ?? ""), enabled: !!filters.intentId});

 const receipt = useQuery({queryKey: aiKeys.receipt(campaignId, filters.intentId ?? ""), queryFn: () => getAssistantReceipt(campaignId, filters.intentId ?? ""), enabled: !!filters.intentId && ["applied", "executing", "unknown", "failed"].includes(detail.data?.status ?? ""), refetchInterval: detail.data?.status === "executing" ? ASSISTANT_POLLING.executingReceiptMs : false});

 useEffect(()=>{ if(receipt.data && !("deleted" in receipt.data))void consumeReceipt(receipt.data); },[receipt.data,consumeReceipt]);

 const refresh = async () => { await Promise.all([client.invalidateQueries({queryKey:aiKeys.intentsRoot(campaignId)}), client.invalidateQueries({queryKey:aiKeys.intentRoot(campaignId)}),client.invalidateQueries({queryKey:aiKeys.receiptsRoot(campaignId)}),client.invalidateQueries({queryKey:aiKeys.proposalsRoot(campaignId)})]); };

 const applyLegacy = useMutation({mutationFn:async(id:string)=>{ await flushAssistantBeforeApply(campaignId);

return applyAiProposal(campaignId,id); },onSuccess:async(result, id)=>{ await consumeReceipt({id:`legacy:${id}`,status:"applied",effectsStatus:"complete",result:{data:null,affected:["deck" in result?{domain:"show",id:result.deck.id,name:"Show"}:{domain:"scenario",id:result.id,name:"Scenario"}],warnings:[]}}); },onSettled:refresh});

 const rejectLegacy = useMutation({mutationFn:(id:string)=>rejectAiProposal(campaignId,id),onSettled:refresh});

 const confirm = useMutation({mutationFn:async(id:string)=>{ await flushAssistantBeforeApply(campaignId);

return confirmAssistantIntent(campaignId,id); },onSuccess:async(value,id)=>{
 client.setQueryData(aiKeys.receipt(campaignId,id),value);
 client.setQueryData<IntentDetail>(aiKeys.intent(campaignId,id),old=>old?{...old,status:value.status}:old);
 await consumeReceipt(value);
 },onSettled:refresh});

 const reject = useMutation({mutationFn:(id:string)=>rejectAssistantIntent(campaignId,id),onSettled:refresh});

 return {query,detail,receipt,legacy,applyLegacy:applyLegacy.mutateAsync,rejectLegacy:rejectLegacy.mutateAsync,items:Array.from(new Map((query.data?.items ?? []).map(item=>[item.id,item])).values()),nextCursor:query.data?.nextCursor,confirm:confirm.mutateAsync,reject:reject.mutateAsync,busy:confirm.isPending||reject.isPending,error:confirm.error||reject.error,refresh};
}
