"use client";
import { intentStatusLabels } from "./AssistantIntentCard";

import { Button } from "@/components/ui/button";
import type { IntentSummary } from "@/types/assistant";
export function AssistantQueue({items,selectedId,onSelect,onNext,onPrevious}:{items:IntentSummary[];selectedId?:string;onSelect:(id:string)=>void;onNext?:()=>void;onPrevious?:()=>void}) {
 return <section aria-label="Черга перегляду" className="min-w-0 space-y-2"><h2 className="font-semibold">Черга перегляду · pending {items.filter(i=>i.status==="pending").length}</h2><p className="text-xs">20 на сторінку, максимум 50</p>{items.map(item=><Button className="h-auto w-full justify-start whitespace-normal break-words text-left" variant={selectedId===item.id?"secondary":"outline"} key={item.id} onClick={()=>onSelect(item.id)}>{item.summary} · {item.channel} · {intentStatusLabels[item.status]}</Button>)}<nav className="flex flex-wrap gap-2">{onPrevious&&<Button variant="outline" onClick={onPrevious}>Попередні пропозиції</Button>}{onNext&&<Button variant="outline" onClick={onNext}>Наступні пропозиції</Button>}</nav></section>;
}
