"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { type Section, sectionTitle } from "./acquaintance-fields";
import type { AcquaintanceDialogTarget } from "./acquaintance-target";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { ACQUAINTANCE_LIMITS } from "@/lib/constants/acquaintances";
import { useAcquaintanceActions } from "@/lib/hooks/acquaintances";
import { useConfirm } from "@/lib/hooks/common";
import type { AcquaintanceView } from "@/types/acquaintances";

export function AcquaintanceJournal({ campaignId, item, target, sections }: { campaignId: string; item: AcquaintanceView; target: Extract<AcquaintanceDialogTarget, { mode: "edit" }>; sections: Section[] }) {
  const t = useTranslations("scenario.acquaintance");

  const tActions = useTranslations("common.actions");

  const { addEntry, removeEntry } = useAcquaintanceActions(campaignId);

  const confirm = useConfirm();

  const [sectionId, setSectionId] = useState(target.sectionId);

  const [text, setText] = useState("");

  const add = async () => {
    const created = await addEntry.mutateAsync({ id: item.id, data: { pageId: target.pageId, sectionId, text: text.trim() } }).catch(() => null);

    if (created) setText("");
  };

  const remove = async (entryId: string) => {
    if (await confirm({ title: t("deleteEntryTitle"), confirmLabel: tActions("delete") })) await removeEntry.mutateAsync({ id: item.id, entryId }).catch(() => null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-hud-muted">{t("journal")}</p>
      {item.entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-2 rounded border border-hud-line p-2 text-sm">
          <div>
            <p>{e.text}</p>
            <p className="text-xs text-hud-muted">{sectionTitle(sections, e.pageId, e.sectionId, target.pageId, t("otherPage"))}{e.hidden ? t("hiddenSuffix") : ""}</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => void remove(e.id)}>
            {tActions("delete")}
          </Button>
        </div>
      ))}
      <SelectField aria-label={t("entrySection")} value={sectionId} onValueChange={setSectionId} options={sections.map((s) => ({ value: s.id, label: s.title }))} />
      <Textarea aria-label={t("entryText")} value={text} maxLength={ACQUAINTANCE_LIMITS.entry} onChange={(e) => setText(e.target.value)} />
      <Button type="button" size="sm" disabled={!text.trim() || addEntry.isPending} onClick={() => void add()}>
        {t("addEntry")}
      </Button>
    </div>
  );
}
