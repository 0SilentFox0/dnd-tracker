"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { AiPanel } from "./AiPanel";
import { AssistantReview } from "./AssistantReview";

import { Button } from "@/components/ui/button";
import { useTranslator } from "@/lib/i18n/use-translator";
import { focusLabelOf } from "@/lib/utils/ai/focus";
import type { AiFocus } from "@/types/ai";
export function AssistantWorkspace({campaignId,campaignName,initialIntentId}:{campaignId:string;campaignName:string;initialIntentId?:string}) {
 const t=useTranslations("ai");

 const tr=useTranslator("ai");

 const [focus,setFocus]=useState<AiFocus>();

 const [kind,setKind]=useState("campaign");

 const [id,setId]=useState("");

 const label=focusLabelOf(tr,undefined,focus);

 const pick=()=>{ const value=id.trim();

 if(kind==="campaign")setFocus({kind:"campaign"});else if(value)setFocus(kind==="character"?{kind:"character",characterId:value}:kind==="battle"?{kind:"battle",battleId:value}:{pageId:value}); };

 return <main className="mx-auto flex min-h-[85dvh] max-w-7xl flex-col gap-3 p-3"><form className="flex flex-wrap items-center gap-2" onSubmit={event=>{ event.preventDefault();pick(); }}><label>{t("workspace.focusKind")}<select aria-label={t("workspace.focusKind")} value={kind} onChange={event=>setKind(event.target.value)}><option value="campaign">{t("workspace.kinds.campaign")}</option><option value="scenario">{t("workspace.kinds.scenario")}</option><option value="character">{t("workspace.kinds.character")}</option><option value="battle">{t("workspace.kinds.battle")}</option></select></label>{kind!=="campaign"&&<label>{t("workspace.focusId")}<input aria-label={t("workspace.focusId")} maxLength={40} value={id} onChange={event=>setId(event.target.value)}/></label>}<Button type="submit" variant="outline" disabled={kind!=="campaign"&&!id.trim()}>{t("workspace.pick")}</Button>{label&&<><p className="break-words">{label}</p><Button type="button" variant="outline" onClick={()=>setFocus(undefined)}>{t("workspace.clear")}</Button></>}</form><div className="min-h-0 flex-1"><AiPanel campaignId={campaignId} campaignName={campaignName} mode="scenario" embedded focus={{value:focus,onClear:()=>setFocus(undefined)}} proposals={{review:<AssistantReview campaignId={campaignId} initialIntentId={initialIntentId} />}} actions={{onClose:()=>{}}} /></div></main>;
}
