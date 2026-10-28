"use client";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AssistantReviewReceipt, IntentDetail } from "@/types/assistant";

export const intentStatusLabels = {pending:"Очікує перегляду",executing:"Виконується",applied:"Застосовано",rejected:"Відхилено",stale:"Пропозиція застаріла: потрібен новий перегляд",expired:"Термін пропозиції минув",failed:"Помилка виконання",unknown:"Результат невідомий — відновіть стан"};
export function AssistantIntentCard({intent,onConfirm,onReject,onRefine,busy=false,receipt}:{intent:IntentDetail;onConfirm:()=>void;onReject:()=>void;onRefine:()=>void;busy?:boolean;receipt?:AssistantReviewReceipt}) {
 const [page,setPage]=useState(0);

 const [now,setNow]=useState(()=>Date.now());

 useEffect(()=>{ const timer=setInterval(()=>setNow(Date.now()),1000);

return ()=>clearInterval(timer); },[]);

 const expired=Date.parse(intent.expiresAt)<=now;

 const pending=intent.status==="pending"&&!expired;

 const changes=intent.preview.changes;

 const pages=Math.max(1,Math.ceil(changes.length/20));

 return <section role="region" aria-label={intent.summary} className="min-w-0 space-y-3 rounded-lg border bg-card p-3 text-card-foreground">
 <h3 className="font-medium">{intent.summary}</h3><p className="break-words text-xs">{intent.actionId} · {intent.channel === "mcp" ? "MCP" : "Чат"} · {intent.id}</p>
 <p role="status">{intentStatusLabels[expired&&intent.status==="pending"?"expired":intent.status]}</p>
 <p className="text-xs">Дійсна до: {new Date(intent.expiresAt).toLocaleString("uk-UA")}</p>
 <ul>{intent.targets.map((t,i)=><li className="break-words" key={i}>{t.name} · {t.domain} · {t.id}</li>)}</ul>
 {intent.preview.warnings.map((w,i)=><p role="note" key={i}>{w}</p>)}
 {intent.preview.effects.map((effect,i)=><div className="break-words rounded border p-2" key={i}><p>{effect.kind === "paid" ? "Платна генерація: потрібне явне підтвердження" : "Наслідки"}: {effect.description}</p><ul>{effect.targets.map((t,j)=><li key={j}>{t.name} · {t.domain} · {t.id}</li>)}</ul></div>)}
 <p>Повний перегляд змін: {changes.length}. Сторінка {page+1} із {pages}</p>
 {changes.slice(page*20,(page+1)*20).map((change,i)=><div key={i} className="min-w-0 space-y-1 border-t pt-2"><p className="break-words">{change.target.name} · {change.path}</p><div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-2"><div><p>Було</p><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(change.before,null,2)}</pre></div><div><p>Стане</p><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(change.after,null,2)}</pre></div></div></div>)}
 {pages>1&&<nav aria-label="Сторінки змін" className="flex flex-wrap gap-2"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Попередні зміни</Button><Button variant="outline" disabled={page+1>=pages} onClick={()=>setPage(p=>p+1)}>Наступні зміни</Button></nav>}
 {receipt&&!("deleted" in receipt)&&<div role="status"><p>{intentStatusLabels[receipt.status]} · Оновлення: {receipt.effectsStatus === "complete" ? "завершено" : receipt.effectsStatus === "failed" ? "помилка" : receipt.effectsStatus === "unknown" ? "невідомо" : "очікується"}</p><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(receipt.result,null,2)}</pre></div>}
 {receipt&&"deleted" in receipt&&<p role="status">Кампанію видалено. Квитанція {receipt.id}</p>}
 <div className="flex flex-wrap gap-2">{pending&&<Button disabled={busy} onClick={onConfirm}>Застосувати</Button>}{pending&&<Button disabled={busy} variant="outline" onClick={onReject}>Відхилити</Button>}<Button disabled={busy} variant="outline" onClick={onRefine}>Уточнити</Button></div>
 </section>;
}
