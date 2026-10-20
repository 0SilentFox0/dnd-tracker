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

  useEffect(() => {
    if (!editor) return;

    onReady(editor);

    return () => onReady(null);
  }, [editor, onReady]);

  return <EditorContent editor={editor} />;
}
