"use client";

import { useEffect, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";

import { buildExtensions } from "./extensions";

import type { MentionOption, RichDoc } from "@/types/scenario";

export function RichTextEditor({
  doc,
  onChange,
  onReady,
  searchMentions,
  label,
}: {
  doc: RichDoc;
  onChange: (doc: RichDoc) => void;
  onReady: (editor: Editor | null) => void;
  searchMentions: (q: string) => Promise<MentionOption[]>;
  label: string;
}) {
  const extensions = useMemo(() => buildExtensions(searchMentions), [searchMentions]);

  const editor = useEditor({
    extensions,
    content: doc,
    immediatelyRender: false,
    autofocus: "end",
    editorProps: { attributes: { "aria-label": label, class: "sb-editor" } },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichDoc),
  });

  // The draft hook retains dirty local content on a remote conflict. A changed
  // doc here is an accepted clean update or an explicit reload by the DM.
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(doc)) editor.commands.setContent(doc, { emitUpdate: false });
  }, [editor, doc]);

  useEffect(() => {
    if (!editor) return;

    onReady(editor);

    return () => onReady(null);
  }, [editor, onReady]);

  return <EditorContent editor={editor} />;
}
