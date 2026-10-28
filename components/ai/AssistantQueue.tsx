"use client";
import { intentStatusLabels } from "./AssistantIntentCard";

import { PagerNav } from "@/components/common/PagerNav";
import { Button } from "@/components/ui/button";
import { ASSISTANT_PAGE_SIZES } from "@/lib/constants/ai";
import type { IntentSummary } from "@/types/assistant";
export function AssistantQueue({items,selectedId,onSelect,onNext,onPrevious}:{items:IntentSummary[];selectedId?:string;onSelect:(id:string)=>void;onNext?:()=>void;onPrevious?:()=>void}) {
 return <section aria-label="Черга перегляду" className="min-w-0 space-y-2"><h2 className="font-semibold">Черга перегляду · pending {items.filter(i=>i.status==="pending").length}</h2><p className="text-xs">{ASSISTANT_PAGE_SIZES.queue} на сторінку, максимум {ASSISTANT_PAGE_SIZES.queueMax}</p>{items.map(item=><Button className="h-auto w-full justify-start whitespace-normal break-words text-left" variant={selectedId===item.id?"secondary":"outline"} key={item.id} onClick={()=>onSelect(item.id)}>{item.summary} · {item.channel} · {intentStatusLabels[item.status]}</Button>)}<PagerNav pager={{page:0,canPrev:!!onPrevious,canNext:!!onNext,prev:()=>onPrevious?.(),next:()=>onNext?.()}} labels={{prev:"Попередні пропозиції",next:"Наступні пропозиції"}}/></section>;
}
