"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { AI_MODE_LABELS, AI_MODELS, AI_PROVIDER_LABELS, type AiProvider, defaultModelFor } from "@/lib/constants/ai";
import type { AiThread } from "@/types/ai";

interface AiThreadHeaderProps {
  threads: AiThread[];
  thread: AiThread | null;
  providers: AiProvider[];
  actions: { onSelect: (threadId: string) => void; onCreate: () => void; onChangeModel: (provider: AiProvider, model: string) => void; onClose: () => void };
}

export function AiThreadHeader({ threads, thread, providers, actions }: AiThreadHeaderProps) {
  const providerOptions = providers.map((p) => ({ value: p, label: AI_PROVIDER_LABELS[p] }));

  return (
    <div className="flex flex-col gap-2 border-b pb-2" data-slot="ai-thread-header">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">{thread ? AI_MODE_LABELS[thread.mode] : "AI"}</h2>
        <Button type="button" size="sm" variant="outline" onClick={actions.onCreate}>
          <Plus className="size-3.5" aria-hidden /> Новий тред
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Закрити" onClick={actions.onClose}>
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      {thread ? (
        <>
          <SelectField aria-label="Тред" value={thread.id} onValueChange={actions.onSelect} options={threads.map((t) => ({ value: t.id, label: t.title || "Новий тред" }))} />
          <div className="flex gap-2">
            <SelectField
              aria-label="Провайдер"
              className="flex-1"
              value={thread.provider}
              onValueChange={(p) => actions.onChangeModel(p as AiProvider, defaultModelFor(p as AiProvider, thread.mode))}
              options={providerOptions}
            />
            <SelectField
              aria-label="Модель"
              className="flex-1"
              value={thread.model}
              onValueChange={(m) => actions.onChangeModel(thread.provider, m)}
              options={AI_MODELS[thread.provider].map((m) => ({ value: m.id, label: m.label }))}
            />
          </div>
          <p className="text-xs text-muted-foreground" title="Токени треду">
            ↑{thread.usage.inputTokens} ↓{thread.usage.outputTokens}
          </p>
        </>
      ) : null}
    </div>
  );
}
