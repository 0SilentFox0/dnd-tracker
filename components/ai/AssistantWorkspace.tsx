"use client";
import { useState } from "react";

import { AiPanel } from "./AiPanel";
import { AssistantReview } from "./AssistantReview";

import { Button } from "@/components/ui/button";
import type { AiFocus } from "@/types/ai";
export function AssistantWorkspace({campaignId,campaignName,initialIntentId}:{campaignId:string;campaignName:string;initialIntentId?:string}) {
 const [focus,setFocus]=useState<AiFocus>();

 const [kind,setKind]=useState("campaign");

 const [id,setId]=useState("");

 const label=focus?.kind === "character" ? `Фокус: герой ${focus.characterId}` : focus?.kind === "battle" ? `Фокус: бій ${focus.battleId}` : focus && "pageId" in focus ? `Фокус: сторінка ${focus.pageId}` : focus ? "Фокус: кампанія" : null;

 const pick=()=>{ const value=id.trim();

 if(kind==="campaign")setFocus({kind:"campaign"});else if(value)setFocus(kind==="character"?{kind:"character",characterId:value}:kind==="battle"?{kind:"battle",battleId:value}:{pageId:value}); };

 return <main className="mx-auto flex min-h-[85dvh] max-w-7xl flex-col gap-3 p-3"><form className="flex flex-wrap items-center gap-2" onSubmit={event=>{ event.preventDefault();pick(); }}><label>Тип фокусу<select aria-label="Тип фокусу" value={kind} onChange={event=>setKind(event.target.value)}><option value="campaign">Кампанія</option><option value="scenario">Сторінка</option><option value="character">Герой</option><option value="battle">Бій</option></select></label>{kind!=="campaign"&&<label>ID фокусу<input aria-label="ID фокусу" maxLength={40} value={id} onChange={event=>setId(event.target.value)}/></label>}<Button type="submit" variant="outline" disabled={kind!=="campaign"&&!id.trim()}>Обрати фокус</Button>{label&&<><p className="break-words">{label}</p><Button type="button" variant="outline" onClick={()=>setFocus(undefined)}>Очистити фокус</Button></>}</form><div className="min-h-0 flex-1"><AiPanel campaignId={campaignId} campaignName={campaignName} mode="scenario" embedded focus={focus} review={<AssistantReview campaignId={campaignId} initialIntentId={initialIntentId} />} actions={{onClose:()=>{},onClearFocus:()=>setFocus(undefined)}} /></div></main>;
}
