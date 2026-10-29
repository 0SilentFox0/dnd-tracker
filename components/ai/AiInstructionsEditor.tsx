"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_LIMITS } from "@/lib/constants/ai";

interface AiInstructionsEditorProps {
  value: string;
  onSave: (text: string) => Promise<boolean>;
  pending?: boolean;
}

export function AiInstructionsEditor({ value, onSave, pending = false }: AiInstructionsEditorProps) {
  const t = useTranslations("ai");

  const tc = useTranslations("common");

  const [draft, setDraft] = useState(value);

  const [saved, setSaved] = useState(value);

  const over = draft.length > AI_LIMITS.instructionsChars;

  const changed = draft.trim() !== saved.trim();

  const save = async () => {
    if (await onSave(draft)) setSaved(draft);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="ai-instructions" className="text-sm text-hud-muted">
        {t("instructions.label")}
      </label>
      <Textarea
        id="ai-instructions"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        placeholder={t("instructions.placeholder")}
      />
      <p className="text-xs text-hud-muted">{t("instructions.hint")}</p>
      <div className="flex items-center justify-between gap-3">
        <span data-testid="ai-instructions-counter" className={over ? "text-sm text-red-500" : "text-sm text-hud-muted"}>
          {draft.length} / {AI_LIMITS.instructionsChars}
        </span>
        <Button onClick={() => void save()} disabled={!changed || over || pending}>
          {tc("actions.save")}
        </Button>
      </div>
    </div>
  );
}
