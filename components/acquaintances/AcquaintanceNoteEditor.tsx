"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ACQUAINTANCE_LIMITS } from "@/lib/constants/acquaintances";
import { useAcquaintanceNote } from "@/lib/hooks/acquaintances";

export function AcquaintanceNoteEditor({ campaignId, acquaintanceId, initial }: { campaignId: string; acquaintanceId: string; initial: string }) {
  const t = useTranslations("acquaintances");

  const tc = useTranslations("common");

  const { save, isPending } = useAcquaintanceNote(campaignId, acquaintanceId);

  const [text, setText] = useState(initial);

  return (
    <div className="space-y-2">
      <Textarea aria-label={t("note.label")} value={text} maxLength={ACQUAINTANCE_LIMITS.note} placeholder={t("note.placeholder")} onChange={(e) => setText(e.target.value)} />
      <Button type="button" size="sm" variant="outline" disabled={isPending || text === initial} onClick={() => void save(text)}>
        {tc("actions.save")}
      </Button>
    </div>
  );
}
