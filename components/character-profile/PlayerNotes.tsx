"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { useProfile } from "./ProfileContext";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NOTES_MAX } from "@/lib/constants/characters";
import { useCharacterNotes } from "@/lib/hooks/characters";

export function PlayerNotes() {
  const { campaignId, characterId, sheet } = useProfile();

  const t = useTranslations("characterProfile.notes");

  const { save, isPending } = useCharacterNotes(campaignId, characterId);

  const notes = sheet.story.notes;

  const [draft, setDraft] = useState<string | null>(null);

  const commit = async () => {
    if (draft !== null && (await save(draft))) setDraft(null);
  };

  return (
    <section className="mt-6">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="hud-sc text-[13px] tracking-[.06em] text-hud-gold">{t("title")}</h2>
        {draft === null && (
          <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={t("edit")} onClick={() => setDraft(notes ?? "")}>
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
      {draft === null ? (
        notes ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-hud-bone">{notes}</p> : <p className="text-sm text-hud-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Textarea aria-label={t("field")} maxLength={NOTES_MAX} rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isPending} onClick={() => void commit()}>
              {t("save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => setDraft(null)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
