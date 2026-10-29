"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { flushAssistantBeforeApply } from "./useAssistantEffects";

import { getAssistantSourceNotes, previewAssistantContext } from "@/lib/api/assistant";
import type { AiFocus, AssistantContextPreview, AssistantSessionContext } from "@/types/ai";

export function useAssistantContext(campaignId: string, threadId: string, focus: AiFocus | undefined, configuration = "") {
  const t = useTranslations("ai");

  const [selected, setSelected] = useState<string[]>([]);

  const [pendingText, setPendingText] = useState<string | null>(null);

  const [disclosure, setDisclosure] = useState<AssistantContextPreview | null>(null);

  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  const [notes, setNotes] = useState<{ canonicalKey: string; title: string }[]>([]);

  const [nextOffset, setNextOffset] = useState<number | null>(null);

  const [notesOpen, setNotesOpen] = useState(false);

  const [approvedStamp, setApprovedStamp] = useState<string | null>(null);

  const epoch = useRef(0);

  const sending = useRef(false);

  const stamp = JSON.stringify({ campaignId, threadId, focus, selected, configuration });

  const latest = useRef(stamp);

  useEffect(() => { latest.current = stamp; }, [stamp]);

  const getSessionContext = useCallback((): AssistantSessionContext => ({ sourceNoteKeys: [...selected] }), [selected]);

  const selectNotes = (keys: string[]) => {
    if (keys.length > 5 || new Set(keys).size !== keys.length) return;

    setSelected([...keys]); setDisclosure(null); setApprovedStamp(null);
    epoch.current++;
  };

  const requestSend = async (text: string) => {
    const current = ++epoch.current;

    setPendingText(text); setDisclosure(null); setError(""); setBusy(true); setApprovedStamp(null);
    try {
      const value = await previewAssistantContext(campaignId, threadId, { focus, sessionContext: getSessionContext() });

      if (current === epoch.current && latest.current === stamp) { setDisclosure(value); setApprovedStamp(stamp); }
    } catch {
      if (current === epoch.current) setError(t("context.previewFailed"));
    } finally { if (current === epoch.current) setBusy(false); }
  };

  const loadNotes = async (offset = 0) => {
    setNotesOpen(true); setError("");
    try {
      const page = await getAssistantSourceNotes(campaignId, offset);

      setNotes(page.items); setNextOffset(page.nextOffset);
    } catch { setError(t("context.notesFailed")); }
  };

  const cancel = () => {
    epoch.current++;
    setBusy(false); setPendingText(null); setDisclosure(null); setApprovedStamp(null);
  };

  const approve = async (send: (text: string) => unknown) => {
    if (sending.current || !pendingText || !disclosure || approvedStamp !== latest.current) return;

    const attempt = epoch.current;

    sending.current = true; setBusy(true);
    try {
      await flushAssistantBeforeApply(campaignId);

      if (attempt !== epoch.current || approvedStamp !== latest.current) return;

      const text = pendingText;

      cancel();
      await send(text);
    } catch { setError(t("context.sendFailed")); }
    finally { sending.current = false; setBusy(false); }
  };

  return { selected, getSessionContext, selectNotes, pendingText, disclosure, busy, error, requestSend, cancel, approve, notes, nextOffset, notesOpen, loadNotes, canSend: !!disclosure && approvedStamp === stamp };
}
