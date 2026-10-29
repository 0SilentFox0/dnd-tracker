"use client";

import { type KeyboardEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_LIMITS, type AiThreadMode } from "@/lib/constants/ai";

const QUICK_PROMPTS = ["npcName", "nextInScenario", "dc"] as const;

const COUNTER_FROM = 7000;

interface AiComposerProps {
  mode: AiThreadMode;
  busy: boolean;
  focusLabel: string | null;
  actions: { onSend: (text: string) => void; onStop: () => void; onClearFocus: () => void };
}

export function AiComposer({ mode, busy, focusLabel, actions }: AiComposerProps) {
  const t = useTranslations("ai");

  const [text, setText] = useState("");

  const tooLong = text.length > AI_LIMITS.messageChars;

  const submit = () => {
    const value = text.trim();

    if (!value || busy || tooLong) return;

    actions.onSend(value);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;

    e.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-col gap-2 border-t pt-2" data-slot="ai-composer">
      {focusLabel ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1 text-xs">
          <span>{focusLabel}</span>
          <button type="button" aria-label={t("composer.clearFocus")} onClick={actions.onClearFocus}>
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      {mode === "live" && !busy ? (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <Button key={q} type="button" size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => actions.onSend(t(`composer.quickPrompts.${q}`))}>
              {t(`composer.quickPrompts.${q}`)}
            </Button>
          ))}
        </div>
      ) : null}
      <Textarea aria-label={t("composer.message")} rows={2} className="max-h-40 min-h-12" placeholder={t("composer.placeholder")} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} />
      <div className="flex items-center justify-between gap-2">
        <span className={tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{text.length > COUNTER_FROM ? `${text.length}/${AI_LIMITS.messageChars}` : ""}</span>
        {busy ? (
          <Button type="button" size="sm" variant="outline" onClick={actions.onStop}>
            <Square className="size-3.5" aria-hidden /> {t("composer.stop")}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={submit} disabled={!text.trim() || tooLong}>
            <Send className="size-3.5" aria-hidden /> {t("composer.send")}
          </Button>
        )}
      </div>
    </div>
  );
}
