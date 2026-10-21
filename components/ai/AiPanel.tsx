"use client";

import { type ReactNode, useCallback, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { AiComposer } from "./AiComposer";
import { AiMessageList } from "./AiMessageList";
import { AiThreadHeader } from "./AiThreadHeader";

import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { AI_MODE_LABELS, type AiProvider, type AiThreadMode, defaultModelFor } from "@/lib/constants/ai";
import { useAiChat, useAiCredentials, useAiProposals, useAiThreadMessages, useAiThreads } from "@/lib/hooks/ai";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/common";
import type { AiChatMessage, AiFocus, AiThread } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

type Proposals = ReturnType<typeof useAiProposals>;

interface AiPanelProps {
  campaignId: string;
  page: ScenarioPage;
  mode: AiThreadMode;
  focus: AiFocus | undefined;
  proposals: Proposals;
  renderProposal?: (proposalId: string) => ReactNode;
  actions: { onClose: () => void; onClearFocus: () => void };
}

const rowWord = (n: number) => (n === 1 ? "рядок" : n >= 2 && n <= 4 ? "рядки" : "рядків");

function focusLabelOf(page: ScenarioPage, focus: AiFocus | undefined): string | null {
  if (!focus || focus.pageId !== page.id) return null;

  const section = page.content.sections.find((s) => s.id === focus.sectionId);

  const rows = focus.rowIds?.length ?? 0;

  if (!section) return rows ? `Фокус: ${rows} ${rowWord(rows)}` : null;

  return rows ? `Фокус: розділ «${section.title}», ${rows} ${rowWord(rows)}` : `Фокус: розділ «${section.title}»`;
}

interface ThreadChatProps {
  campaignId: string;
  thread: AiThread;
  focus: AiFocus | undefined;
  focusLabel: string | null;
  renderProposal?: (proposalId: string) => ReactNode;
  actions: { onFinish: () => void; onClearFocus: () => void };
}

function AiThreadChat({ campaignId, thread, focus, focusLabel, renderProposal, actions }: ThreadChatProps) {
  const { query, messages } = useAiThreadMessages(campaignId, thread.id);

  if (query.isError) return <p className="text-sm text-destructive">{query.error.message}</p>;

  if (!messages) return <LoadingState rows={2} />;

  return <AiThreadChatBody key={thread.id} campaignId={campaignId} thread={thread} initialMessages={messages} focus={focus} focusLabel={focusLabel} renderProposal={renderProposal} actions={actions} />;
}

function AiThreadChatBody({ campaignId, thread, initialMessages, focus, focusLabel, renderProposal, actions }: ThreadChatProps & { initialMessages: AiChatMessage[] }) {
  const getFocus = useCallback(() => focus, [focus]);

  const chat = useAiChat({ campaignId, thread, initialMessages, getFocus, onFinish: actions.onFinish });

  const busy = chat.status === "streaming" || chat.status === "submitted";

  const redo = () => {
    const last = [...chat.messages].reverse().find((m) => m.role === "user");

    const text = last?.parts.find((p) => p.type === "text");

    if (text && "text" in text) chat.send(text.text);
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <AiMessageList messages={chat.messages} error={chat.error?.message} renderProposal={renderProposal} onRedo={redo} />
      </div>
      <AiComposer mode={thread.mode} busy={busy} focusLabel={focusLabel} actions={{ onSend: chat.send, onStop: chat.stop, onClearFocus: actions.onClearFocus }} />
    </>
  );
}

export function AiPanel({ campaignId, page, mode, focus, proposals, renderProposal, actions }: AiPanelProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY);

  const { query: credentialsQuery, credentials } = useAiCredentials();

  const { query: threadsQuery, threads: all, create, patch } = useAiThreads(campaignId, page.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const threads = all.filter((t) => t.mode === mode);

  const thread = threads.find((t) => t.id === selectedId) ?? threads[0] ?? null;

  const providers = credentials.map((c) => c.provider);

  const createThread = async () => {
    const provider = providers[0];

    if (!provider) return;

    const created = await create({ mode, scenarioPageId: page.id, provider, model: defaultModelFor(provider, mode) });

    setSelectedId(created.id);
  };

  const { refetch } = threadsQuery;

  const onFinish = () => {
    proposals.refresh();
    refetch();
  };

  let body: ReactNode;

  if (credentialsQuery.isLoading || threadsQuery.isLoading) {
    body = <LoadingState rows={2} />;
  } else if (!providers.length) {
    body = (
      <EmptyState
        icon={KeyRound}
        title="Підключіть ключ AI"
        description="Додайте ключ провайдера, щоб користуватися помічником."
        action={
          <Button asChild>
            <Link href="/settings/ai">Налаштування AI</Link>
          </Button>
        }
      />
    );
  } else if (!thread) {
    body = <EmptyState title={`Немає тредів: ${AI_MODE_LABELS[mode]}`} action={<Button onClick={createThread}>Новий тред</Button>} />;
  } else {
    body = <AiThreadChat campaignId={campaignId} thread={thread} focus={focus} focusLabel={focusLabelOf(page, focus)} renderProposal={renderProposal} actions={{ onFinish, onClearFocus: actions.onClearFocus }} />;
  }

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {providers.length ? (
        <AiThreadHeader
          threads={threads}
          thread={thread}
          providers={providers}
          actions={{
            onSelect: setSelectedId,
            onCreate: createThread,
            onChangeModel: (provider: AiProvider, model: string) => thread && patch(thread.id, { provider, model }),
            onClose: actions.onClose,
          }}
        />
      ) : null}
      {body}
    </div>
  );

  if (!desktop) {
    return (
      <ResponsiveDialog open onOpenChange={(open) => !open && actions.onClose()} title={AI_MODE_LABELS[mode]} hud>
        <div className="h-[70dvh]">{content}</div>
      </ResponsiveDialog>
    );
  }

  return (
    <aside data-slot="ai-panel" aria-label="AI-помічник" className="fixed inset-y-0 right-0 z-40 flex w-[420px] flex-col border-l bg-background p-3 shadow-xl">
      {content}
    </aside>
  );
}
