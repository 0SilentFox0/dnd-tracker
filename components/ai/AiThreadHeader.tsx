"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { AssistantPolicyControl } from "./AssistantPolicyControl";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { AI_MODELS, AI_PROVIDER_LABELS, type AiProvider } from "@/lib/constants/ai";
import type { AiThread } from "@/types/ai";

interface AiThreadHeaderProps {
  campaignId?: string;
  threads: AiThread[];
  thread: AiThread | null;
  providers: AiProvider[];
  actions: { onSelect: (threadId: string) => void; onCreate: () => void; onChangeModel: (provider: AiProvider, model?: string) => void; onClose: () => void };
}

export function AiThreadHeader({ campaignId, threads, thread, providers, actions }: AiThreadHeaderProps) {
  const t = useTranslations("ai");

  const providerOptions = providers.map((p) => ({ value: p, label: AI_PROVIDER_LABELS[p] }));

  return (
    <div className="flex flex-col gap-2 border-b pb-2" data-slot="ai-thread-header">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">{thread ? t(`modes.${thread.mode}`) : "AI"}</h2>
        <Button type="button" size="sm" variant="outline" onClick={actions.onCreate}>
          <Plus className="size-3.5" aria-hidden /> {t("thread.new")}
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label={t("thread.close")} onClick={actions.onClose}>
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      {thread ? (
        <>
          <SelectField aria-label={t("thread.thread")} value={thread.id} onValueChange={actions.onSelect} options={threads.map((item) => ({ value: item.id, label: item.title || t("thread.untitled") }))} />
          <div className="flex gap-2">
            <SelectField
              aria-label={t("thread.provider")}
              className="flex-1"
              value={thread.provider}
              onValueChange={(p) => actions.onChangeModel(p as AiProvider)}
              options={providerOptions}
            />
            <SelectField
              aria-label={t("thread.model")}
              className="flex-1"
              value={thread.model}
              onValueChange={(m) => actions.onChangeModel(thread.provider, m)}
              options={AI_MODELS[thread.provider].map((m) => ({ value: m.id, label: m.label }))}
            />
          </div>
          <p className="break-words text-xs">{t("thread.providerModel", { provider: AI_PROVIDER_LABELS[thread.provider], model: thread.model })}</p>
          {campaignId && <AssistantPolicyControl key={thread.id} campaignId={campaignId} target="thread" id={thread.id} executionMode={thread.executionMode} />}
          <p className="text-xs text-muted-foreground" title={t("thread.tokens")}>
            {t(thread.usage.partial ? "usage.linePartial" : "usage.line", { input: thread.usage.inputTokens ?? t("usage.unknown"), output: thread.usage.outputTokens ?? t("usage.unknown") })}
          </p>
        </>
      ) : null}
    </div>
  );
}
