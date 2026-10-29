"use client";

import { useTranslations } from "next-intl";
import type { Editor } from "@tiptap/core";

import { RichTextEditor } from "./RichTextEditor";

import { ScenarioRichText } from "@/components/scenario/ScenarioRichText";
import { isDocEmpty } from "@/lib/utils/scenario/doc";
import type { MentionOption, RichDoc } from "@/types/scenario";

export type CellColumn = "story" | "notes";

type Handlers = { onActivate: () => void; onChange: (doc: RichDoc) => void; onReady: (editor: Editor | null) => void };

export function ScenarioCell({ campaignId, rowId, column, doc, active, searchMentions, handlers }: {
  campaignId: string;
  rowId: string;
  column: CellColumn;
  doc: RichDoc;
  active: boolean;
  searchMentions: (query: string) => Promise<MentionOption[]>;
  handlers: Handlers;
}) {
  const t = useTranslations("scenario.cell");

  if (active) {
    return (
      <div className="sb-cell is-active">
        <RichTextEditor key={`${rowId}-${column}`} doc={doc} label={column === "story" ? t("story") : t("notes")} searchMentions={searchMentions} onReady={handlers.onReady} onChange={handlers.onChange} />
      </div>
    );
  }

  return (
    <div className="sb-cell" role="button" tabIndex={0} onClick={handlers.onActivate} onKeyDown={(e) => e.key === "Enter" && handlers.onActivate()}>
      {isDocEmpty(doc) ? <p className="sb-empty">{column === "story" ? t("storyEmpty") : t("notes")}</p> : <ScenarioRichText doc={doc} campaignId={campaignId} />}
    </div>
  );
}
