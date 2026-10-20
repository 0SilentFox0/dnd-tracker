"use client";

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
  if (active) {
    return (
      <div className="sb-cell is-active">
        <RichTextEditor key={`${rowId}-${column}`} doc={doc} label={column === "story" ? "Сюжет" : "Нотатки майстра"} searchMentions={searchMentions} onReady={handlers.onReady} onChange={handlers.onChange} />
      </div>
    );
  }

  return (
    <div className="sb-cell" role="button" tabIndex={0} onClick={handlers.onActivate} onKeyDown={(e) => e.key === "Enter" && handlers.onActivate()}>
      {isDocEmpty(doc) ? <p className="sb-empty">{column === "story" ? "Сюжет — натисніть, щоб писати" : "Нотатки майстра"}</p> : <ScenarioRichText doc={doc} campaignId={campaignId} />}
    </div>
  );
}
