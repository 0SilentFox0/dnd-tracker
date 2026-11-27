'use client';

import { useEffect, useMemo } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';

import { setAutoMentionIndex } from './auto-mention';
import { buildExtensions } from './extensions';
import { setContentKeepingCaret } from './keep-caret';

import type { AutoMentionIndex } from '@/lib/utils/scenario/auto-mentions';
import type { MentionOption, RichDoc } from '@/types/scenario';

export type MentionSources = {
    search: (q: string) => Promise<MentionOption[]>;
    autoIndex: AutoMentionIndex | null;
};

export function RichTextEditor({
    doc,
    onChange,
    onReady,
    mentions,
    label,
}: {
    doc: RichDoc;
    onChange: (doc: RichDoc) => void;
    onReady: (editor: Editor | null) => void;
    mentions: MentionSources;
    label: string;
}) {
    const extensions = useMemo(
        () => buildExtensions(mentions.search),
        [mentions.search]
    );

    const editor = useEditor({
        extensions,
        content: doc,
        immediatelyRender: false,
        autofocus: 'end',
        editorProps: {
            attributes: { 'aria-label': label, class: 'sb-editor' },
        },
        onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichDoc),
    });

    // The draft hook retains dirty local content on a remote conflict. A changed
    // doc here is an accepted clean update or an explicit reload by the DM.
    useEffect(() => {
        if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(doc))
            setContentKeepingCaret(editor, doc);
    }, [editor, doc]);

    useEffect(() => {
        if (editor) setAutoMentionIndex(editor, mentions.autoIndex);
    }, [editor, mentions.autoIndex]);

    useEffect(() => {
        if (!editor) return;

        onReady(editor);

        return () => onReady(null);
    }, [editor, onReady]);

    return <EditorContent editor={editor} />;
}
