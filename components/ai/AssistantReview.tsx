"use client";
import { useState } from "react";

import { AiProposalCard } from "./AiProposalCard";
import { AssistantIntentCard } from "./AssistantIntentCard";
import { AssistantQueue } from "./AssistantQueue";

import { Button } from "@/components/ui/button";
import { useAssistantIntents } from "@/lib/hooks/ai/useAssistantIntents";

export function AssistantReview({campaignId,initialIntentId}:{campaignId:string;initialIntentId?:string}) {
 const [intentId,setIntentId]=useState(initialIntentId);

 const [cursors,setCursors]=useState<(string|undefined)[]>([undefined]);

 const [refinement,setRefinement]=useState("");

 const [legacyId,setLegacyId]=useState<string>();

 const [legacyBusy,setLegacyBusy]=useState(false);

 const [error,setError]=useState("");

 const queue=useAssistantIntents(campaignId,{cursor:cursors.at(-1),limit:20,intentId});

 const legacy=queue.legacy;

 const linked=new Set(queue.items.map(i=>i.legacyProposalId).filter(Boolean));

 const legacyItems=(legacy.data??[]).filter(p=>!p.assistantIntentId && !linked.has(p.id));

 const proposal=legacyItems.find(p=>p.id===legacyId);

 const run=async(action:()=>Promise<unknown>)=>{ setError("");try { await action(); } catch { setError("Не вдалося виконати дію. Відновіть стан і перевірте пропозицію."); } };

 const detail=queue.detail.data;

 const review=<div className="grid min-h-0 min-w-0 gap-4 overflow-y-auto lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
 <div><AssistantQueue items={queue.items} selectedId={intentId} onSelect={id=>{ setIntentId(id);setLegacyId(undefined); }} onNext={queue.nextCursor?()=>setCursors(c=>[...c,queue.nextCursor??undefined]):undefined} onPrevious={cursors.length>1?()=>setCursors(c=>c.slice(0,-1)):undefined} />
 {legacyItems.map(p=><Button key={p.id} variant="outline" className="mt-2 h-auto w-full whitespace-normal" onClick={()=>{ setLegacyId(p.id);setIntentId(undefined); }}>{p.summary} · Сценарій</Button>)}
 {(queue.query.isError||legacy.isError)&&<p role="alert">Не вдалося завантажити чергу</p>}</div>
 <div className="min-w-0">{queue.detail.isLoading&&intentId&&<p role="status">Завантаження пропозиції…</p>}{queue.detail.isError&&intentId&&queue.receipt.data?.status!=="applied"&&<p role="alert">Пропозиція недоступна або її вміст очищено</p>}
 {detail&&!(queue.receipt.data&&"deleted" in queue.receipt.data)&&<AssistantIntentCard key={detail.id} intent={detail} receipt={queue.receipt.data} busy={queue.busy} onConfirm={()=>void run(()=>queue.confirm(detail.id))} onReject={()=>void run(()=>queue.reject(detail.id))} onRefine={()=>setRefinement(`Уточніть запит для пропозиції «${detail.summary}». Надішліть новий запит у чаті; це не застосовує змін.`)} />}
 {queue.receipt.data&&"deleted" in queue.receipt.data&&<p role="status">Кампанію видалено. Квитанція {queue.receipt.data.id}</p>}
 {proposal&&<AiProposalCard campaignId={campaignId} proposal={proposal} busy={legacyBusy} actions={{onApply:()=>void run(async()=>{ setLegacyBusy(true);try { await queue.applyLegacy(proposal.id);await legacy.refetch();await queue.refresh(); } finally { setLegacyBusy(false); } }),onReject:()=>void run(async()=>{ await queue.rejectLegacy(proposal.id);await legacy.refetch();await queue.refresh(); }),onRedo:()=>setRefinement("Уточніть запит у чаті та створіть нову пропозицію.")}} />}
 {(error||queue.error)&&<p role="alert">{error||"Не вдалося виконати дію"}</p>}{queue.receipt.isError&&<p role="alert">Не вдалося прочитати квитанцію. Відновіть стан.</p>}{refinement&&<p role="status">{refinement}</p>}
 <Button variant="outline" onClick={()=>void queue.refresh()}>Відновити чергу</Button></div></div>;

 return review;
}
