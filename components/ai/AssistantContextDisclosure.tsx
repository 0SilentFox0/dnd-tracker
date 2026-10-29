"use client";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { AI_LIMITS } from "@/lib/constants/ai";
import type { useAssistantContext } from "@/lib/hooks/ai/useAssistantContext";

export function AssistantContextDisclosure({context,onSend}:{context:ReturnType<typeof useAssistantContext>;onSend:(text:string)=>unknown}) {
 const t=useTranslations("ai");

 const tc=useTranslations("common");

 return <div className="space-y-2 text-sm">
 <Button variant="outline" onClick={()=>void context.loadNotes()}>{t("context.pickNotes",{count:context.selected.length})}</Button>
 {context.notesOpen&&<fieldset className="space-y-1"><legend>{t("context.notesLegend")}</legend><p>{t("context.notesEmpty")}</p>{context.notes.map(note=><label key={note.canonicalKey} className="flex items-center gap-2"><input type="checkbox" checked={context.selected.includes(note.canonicalKey)} disabled={context.selected.length>=5&&!context.selected.includes(note.canonicalKey)} onChange={event=>context.selectNotes(event.target.checked?[...context.selected,note.canonicalKey]:context.selected.filter(key=>key!==note.canonicalKey))}/>{note.title}</label>)}{context.nextOffset!==null&&<Button variant="outline" onClick={()=>void context.loadNotes(context.nextOffset??0)}>{t("context.nextSources")}</Button>}<Button variant="outline" onClick={()=>context.selectNotes([])}>{t("context.clearNotes")}</Button></fieldset>}
 {context.error&&<p role="alert">{context.error}</p>}
 <ResponsiveDialog open={context.pendingText!==null} onOpenChange={open=>{ if(!open)context.cancel(); }} title={t("context.dialogTitle")} description={t("context.dialogDescription")} footer={<><Button variant="outline" onClick={context.cancel}>{tc("actions.cancel")}</Button><Button disabled={!context.canSend||context.busy} onClick={()=>void context.approve(onSend)}>{t("context.sendSelected")}</Button></>}>
 {context.busy&&<p role="status">{t("context.checking")}</p>}
 {context.disclosure&&<div className="space-y-2"><p className="break-words">{t("thread.providerModel",{provider:context.disclosure.provider,model:context.disclosure.model})}</p><ul>{context.disclosure.labels.map(label=><li className="break-words" key={label}>{label}</li>)}</ul><p>{t("context.size",{characters:context.disclosure.characters,max:AI_LIMITS.contextChars,truncated:String(context.disclosure.truncated)})}</p><p>{t("context.history",{limit:context.disclosure.historyLimit})}</p><p>{t("context.sourceNotes",{count:context.disclosure.sourceNoteCount,keys:context.selected.join(", ")})}</p>{!context.disclosure.focusAvailable&&<p role="alert">{t("context.focusUnavailable")}</p>}<p>{t("context.paid")}</p></div>}
 {context.error&&<p role="alert">{context.error}</p>}{!context.busy&&!context.canSend&&<Button variant="outline" onClick={()=>void context.requestSend(context.pendingText??"")}>{t("context.refresh")}</Button>}
 </ResponsiveDialog>
 </div>;
}
