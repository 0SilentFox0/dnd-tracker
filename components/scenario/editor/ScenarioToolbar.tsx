"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { AtSign, Bold, Contact, Heading3, Italic, List, Megaphone, MessageSquareQuote, Redo2, Table, Undo2, VenetianMask } from "lucide-react";

import { CALLOUT_KINDS } from "@/lib/constants/scenario";
import type { CalloutKind } from "@/types/scenario";

function Tool({ label, active = false, disabled = false, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="toggle" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

export function ScenarioToolbar({ editor, onAcquaintance }: { editor: Editor | null; onAcquaintance?: () => void }) {
  const t = useTranslations("scenario.toolbar");

  const tCallouts = useTranslations("scenario.calloutKinds");

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e && {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        secret: e.isActive("secret"),
        acquaintance: e.isActive("mention", { type: "acquaintance" }),
        h3: e.isActive("heading", { level: 3 }),
        list: e.isActive("bulletList"),
        read: e.isActive("readAloud"),
        say: e.isActive("say"),
        callout: e.isActive("callout"),
        calloutKind: (e.getAttributes("callout").kind as CalloutKind | undefined) ?? "event",
        calloutTag: String(e.getAttributes("callout").tag ?? ""),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      },
  });

  const run = (fn: (e: Editor) => void) => editor && fn(editor);

  const off = !editor || !state;

  return (
    <div className="sb-toolbar" role="toolbar" aria-label={t("formatting")}>
      <Tool label={t("bold")} active={state?.bold} disabled={off} onClick={() => run((e) => e.chain().focus().toggleBold().run())}><Bold className="size-4" /></Tool>
      <Tool label={t("italic")} active={state?.italic} disabled={off} onClick={() => run((e) => e.chain().focus().toggleItalic().run())}><Italic className="size-4" /></Tool>
      <Tool label={t("subheading")} active={state?.h3} disabled={off} onClick={() => run((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}><Heading3 className="size-4" /></Tool>
      <Tool label={t("list")} active={state?.list} disabled={off} onClick={() => run((e) => e.chain().focus().toggleBulletList().run())}><List className="size-4" /></Tool>
      <Tool label={t("readAloud")} active={state?.read} disabled={off} onClick={() => run((e) => e.chain().focus().toggleWrap("readAloud").run())}><Megaphone className="size-4" /></Tool>
      <Tool label={t("say")} active={state?.say} disabled={off} onClick={() => run((e) => (e.isActive("say") ? e.chain().focus().setParagraph().run() : e.chain().focus().setNode("say").run()))}><MessageSquareQuote className="size-4" /></Tool>
      <select
        aria-label={t("callout")}
        disabled={off}
        value={state?.callout ? state.calloutKind : ""}
        onChange={(ev) =>
          run((e) => {
            const kind = ev.target.value as CalloutKind | "";

            if (!kind) return void e.chain().focus().lift("callout").run();

            if (e.isActive("callout")) return void e.chain().focus().updateAttributes("callout", { kind }).run();

            e.chain().focus().toggleWrap("callout", { kind, tag: tCallouts(kind) }).run();
          })
        }
      >
        <option value="">{t("calloutPlaceholder")}</option>
        {CALLOUT_KINDS.map((k) => (
          <option key={k} value={k}>
            {tCallouts(k)}
          </option>
        ))}
      </select>
      {state?.callout && (
        <input aria-label={t("calloutTitle")} value={state.calloutTag} maxLength={120} onChange={(ev) => run((e) => e.chain().updateAttributes("callout", { tag: ev.target.value }).run())} />
      )}
      <Tool label={t("greenToken")} disabled={off} onClick={() => run((e) => e.chain().focus().insertContent({ type: "token", attrs: { color: "green" } }).run())}><span className="g" /></Tool>
      <Tool label={t("redToken")} disabled={off} onClick={() => run((e) => e.chain().focus().insertContent({ type: "token", attrs: { color: "red" } }).run())}><span className="r" /></Tool>
      <Tool label={t("secret")} active={state?.secret} disabled={off} onClick={() => run((e) => e.chain().focus().toggleMark("secret").run())}><VenetianMask className="size-4" /></Tool>
      <Tool label={t("acquaintance")} active={state?.acquaintance} disabled={off || !onAcquaintance} onClick={() => onAcquaintance?.()}><Contact className="size-4" /></Tool>
      <Tool label={t("table")} disabled={off} onClick={() => run((e) => e.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: false }).run())}><Table className="size-4" /></Tool>
      <Tool label={t("mention")} disabled={off} onClick={() => run((e) => e.chain().focus().insertContent("@").run())}><AtSign className="size-4" /></Tool>
      <Tool label={t("undo")} disabled={off || !state?.canUndo} onClick={() => run((e) => e.chain().focus().undo().run())}><Undo2 className="size-4" /></Tool>
      <Tool label={t("redo")} disabled={off || !state?.canRedo} onClick={() => run((e) => e.chain().focus().redo().run())}><Redo2 className="size-4" /></Tool>
    </div>
  );
}
