"use client";
import { useFormatter, useTranslations } from "next-intl";

import { PagerNav } from "@/components/common/PagerNav";
import { Button } from "@/components/ui/button";
import { ASSISTANT_PAGE_SIZES } from "@/lib/constants/ai";
import { useExpiry, usePager } from "@/lib/hooks/common";
import type { AssistantReviewReceipt, IntentDetail } from "@/types/assistant";

export function AssistantIntentCard({intent,onConfirm,onReject,onRefine,busy=false,receipt}:{intent:IntentDetail;onConfirm:()=>void;onReject:()=>void;onRefine:()=>void;busy?:boolean;receipt?:AssistantReviewReceipt}) {
 const t=useTranslations("ai");

 const format=useFormatter();

 const expired=useExpiry(intent.expiresAt);

 const pending=intent.status==="pending"&&!expired;

 const changes=intent.preview.changes;

 const pager=usePager(changes,ASSISTANT_PAGE_SIZES.changes);

 return <section role="region" aria-label={intent.summary} className="min-w-0 space-y-3 rounded-lg border bg-card p-3 text-card-foreground">
 <h3 className="font-medium">{intent.summary}</h3><p className="break-words text-xs">{intent.actionId} · {intent.channel === "mcp" ? "MCP" : t("intent.channelChat")} · {intent.id}</p>
 <p role="status">{t(`intentStatus.${expired&&intent.status==="pending"?"expired":intent.status}`)}</p>
 <p className="text-xs">{t("intent.validUntil",{date:format.dateTime(new Date(intent.expiresAt),{dateStyle:"short",timeStyle:"medium"})})}</p>
 <ul>{intent.targets.map((t,i)=><li className="break-words" key={i}>{t.name} · {t.domain} · {t.id}</li>)}</ul>
 {intent.preview.warnings.map((w,i)=><p role="note" key={i}>{w}</p>)}
 {intent.preview.effects.map((effect,i)=><div className="break-words rounded border p-2" key={i}><p>{t("intent.effectLine",{label:effect.kind === "paid" ? t("intent.paid") : t("intent.effects"),description:effect.description})}</p><ul>{effect.targets.map((t,j)=><li key={j}>{t.name} · {t.domain} · {t.id}</li>)}</ul></div>)}
 <p>{t("intent.fullPreview",{count:changes.length,page:pager.page+1,pages:pager.pageCount})}</p>
 {pager.pageItems.map((change,i)=><div key={i} className="min-w-0 space-y-1 border-t pt-2"><p className="break-words">{change.target.name} · {change.path}</p><div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-2"><div><p>{t("intent.before")}</p><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(change.before,null,2)}</pre></div><div><p>{t("intent.after")}</p><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(change.after,null,2)}</pre></div></div></div>)}
 {pager.pageCount>1&&<PagerNav ariaLabel={t("intent.pagesAria")} pager={pager} labels={{prev:t("intent.prevChanges"),next:t("intent.nextChanges")}}/>}
 {receipt&&!("deleted" in receipt)&&<div role="status"><p>{t("intent.receiptLine",{status:t(`intentStatus.${receipt.status}`),effects:t(`effectsStatus.${receipt.effectsStatus}`)})}</p><pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(receipt.result,null,2)}</pre></div>}
 {receipt&&"deleted" in receipt&&<p role="status">{t("review.campaignDeleted",{id:receipt.id})}</p>}
 <div className="flex flex-wrap gap-2">{pending&&<Button disabled={busy} onClick={onConfirm}>{t("intent.confirm")}</Button>}{pending&&<Button disabled={busy} variant="outline" onClick={onReject}>{t("intent.reject")}</Button>}<Button disabled={busy} variant="outline" onClick={onRefine}>{t("intent.refine")}</Button></div>
 </section>;
}
