"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ACQUAINTANCE_LIMITS } from "@/lib/constants/acquaintances";
import { useAcquaintanceNote } from "@/lib/hooks/acquaintances";

export function AcquaintanceNoteEditor({ campaignId, acquaintanceId, initial }: { campaignId: string; acquaintanceId: string; initial: string }) {
  const { save, isPending } = useAcquaintanceNote(campaignId, acquaintanceId);

  const [text, setText] = useState(initial);

  return (
    <div className="space-y-2">
      <Textarea aria-label="Моя нотатка" value={text} maxLength={ACQUAINTANCE_LIMITS.note} placeholder="Твоя нотатка: бачите ти й ДМ" onChange={(e) => setText(e.target.value)} />
      <Button type="button" size="sm" variant="outline" disabled={isPending || text === initial} onClick={() => void save(text)}>
        Зберегти
      </Button>
    </div>
  );
}
