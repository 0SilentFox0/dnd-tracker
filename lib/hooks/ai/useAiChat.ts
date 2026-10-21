"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";

import { createAiChatTransport } from "@/lib/api/ai";
import type { AiChatMessage, AiFocus, AiThread } from "@/types/ai";

interface Params {
  campaignId: string;
  thread: AiThread;
  initialMessages: AiChatMessage[];
  getFocus: () => AiFocus | undefined;
}

export function useAiChat({ campaignId, thread, initialMessages, getFocus }: Params) {
  const focusRef = useRef(getFocus);

  useEffect(() => {
    focusRef.current = getFocus;
  }, [getFocus]);

  // the ref is read only when a message is sent, never during render
  // eslint-disable-next-line react-hooks/refs
  const transport = useMemo(() => createAiChatTransport(campaignId, thread.id, () => focusRef.current()), [campaignId, thread.id]);

  const chat = useChat({ id: thread.id, messages: initialMessages as unknown as UIMessage[], transport });

  return { messages: chat.messages, send: (text: string) => chat.sendMessage({ text }), stop: chat.stop, status: chat.status, error: chat.error };
}
