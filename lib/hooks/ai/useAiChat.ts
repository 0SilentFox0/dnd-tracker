"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

import { cancelAiRun, createAiChatTransport, getAiRunRecovery } from "@/lib/api/ai";
import type { AiChatMessage, AiFocus, AiThread, AssistantSessionContext } from "@/types/ai";

interface Params {
  campaignId: string;
  thread: AiThread;
  initialMessages: AiChatMessage[];
  getFocus: () => AiFocus | undefined;
  onFinish?: () => void;
  getSessionContext?: () => AssistantSessionContext;
  onReceipt?: (receipt: import("@/types/assistant").ReceiptDto) => Promise<void>;
}

export function useAiChat({ campaignId, thread, initialMessages, getFocus, getSessionContext, onReceipt, onFinish }: Params) {
  const focusRef = useRef(getFocus);

  const contextRef = useRef(getSessionContext);

  const receiptRef = useRef(onReceipt);

  useEffect(()=>{ contextRef.current=getSessionContext;receiptRef.current=onReceipt; },[getSessionContext,onReceipt]);

  const activeRequest = useRef<string | null>(null);

  const sending = useRef(false);

  const localStream = useRef(false);

  const epoch = useRef(0);

  const leaseRef = useRef(0);

  const uncertainRef = useRef(false);

  const [blockedUntil,setBlockedUntil]=useState<string|null>(null);

  const [recovering, setRecovering] = useState(false);

  const [recoveryError, setRecoveryError] = useState<Error>();

  useEffect(() => { focusRef.current = getFocus; }, [getFocus]);


  const transport = useMemo(() => createAiChatTransport(campaignId, thread.id, () => focusRef.current(), () => contextRef.current?.() ?? {sourceNoteKeys:[]}), [campaignId, thread.id]);

  const chat = useChat({ id: thread.id, messages: initialMessages as unknown as UIMessage[], transport });

  const { setMessages } = chat;

  const recover = useCallback(async () => {
    if (localStream.current) return;

    const snapshotEpoch = epoch.current;

    try {
      const state = await getAiRunRecovery(campaignId, thread.id);

      if (snapshotEpoch !== epoch.current || localStream.current) return;

      for (const receipt of state.receipts) {
        const result = receipt.result;

        if (result && typeof result === "object" && "affected" in result && Array.isArray(result.affected)) await receiptRef.current?.(receipt as import("@/types/assistant").ReceiptDto);
      }

      const running = state.runs.find(r => r.status === "running");

      const lease = state.runs.filter(r=>r.status!=="running"&&Date.parse(r.expiresAt)>Date.now()).sort((a,b)=>Date.parse(b.expiresAt)-Date.parse(a.expiresAt))[0];

      leaseRef.current=lease?Date.parse(lease.expiresAt):0;
      uncertainRef.current=state.receipts.some(r=>r.status==="unknown"||r.effectsStatus==="unknown")||(state.intents??[]).some(i=>i.status==="unknown"||i.status==="executing");
      setBlockedUntil(lease?.expiresAt??null);
      activeRequest.current = running?.requestId ?? null;
      sending.current = !!running;
      setRecovering(!!running);

      // Receipts remain visible even if Stop happened after a committed tool call.
      const receipts: UIMessage[] = state.receipts.map(r => ({ id: `receipt-${r.id}`, role: "assistant", parts: [{ type: "text", text: `Квитанція ${r.id}: ${r.status === "applied" ? "дію виконано" : r.status === "unknown" ? "результат перевіряється" : "стан дії: " + r.status}.` }] }));

      const pending: UIMessage[] = (state.intents ?? []).map(i => ({ id: `intent-${i.id}`, role: "assistant", parts: [{ type: "text", text: `${i.status === "pending" ? "Потрібне підтвердження" : "Результат перевіряється"}: ${i.summary}. [Переглянути дію](/campaigns/${campaignId}/dm/assistant?intent=${i.id})` }] }));

      setMessages([...(state.messages as unknown as UIMessage[]), ...receipts, ...pending]);
      setRecoveryError(undefined);
    } catch { setRecoveryError(new Error("Не вдалося відновити стан чату. Спробуйте ще раз.")); }
  }, [campaignId, thread.id, setMessages]);

  useEffect(() => {
    void recover();

    const onReconnect = () => void recover();

    window.addEventListener("online", onReconnect);

    return () => window.removeEventListener("online", onReconnect);
  }, [recover]);
  useEffect(() => {
    if (!recovering) return;

    const timer = setInterval(() => void recover(), 1000);

    return () => clearInterval(timer);
  }, [recovering, recover]);

  useEffect(()=>{
    if(!blockedUntil)return;

    const delay=Math.max(0,Date.parse(blockedUntil)-Date.now());

    const timer=setTimeout(()=>{ leaseRef.current=0;setBlockedUntil(null); },delay);

    return ()=>clearTimeout(timer);
  },[blockedUntil]);

  const send = async (text: string) => {
    if (sending.current) return;

    if (leaseRef.current>Date.now()||uncertainRef.current) { setRecoveryError(new Error("Попередній запит ще має захисний інтервал або невідомий результат. Відновіть стан і дочекайтеся завершення."));

return; }

    sending.current = true;
    localStream.current = true;
    epoch.current++;

    const requestId = crypto.randomUUID();

    activeRequest.current = requestId;
    try { await chat.sendMessage({ id: requestId, role: "user", parts: [{ type: "text", text }] }); }
    finally { localStream.current = false; sending.current = false; await recover(); onFinish?.(); }
  };

  const stop = async () => {
    const requestId = activeRequest.current;

    await chat.stop();
    localStream.current = false;

    if (requestId) {
      try { await cancelAiRun(campaignId, thread.id, requestId); }
      catch { setRecoveryError(new Error("Не вдалося підтвердити зупинку. Перевірте стан чату.")); }
    }

    await recover();
  };

  return { blockedUntil, messages: chat.messages, send, stop, recover, status: recovering ? "streaming" as const : chat.status, error: recoveryError ?? chat.error };
}
