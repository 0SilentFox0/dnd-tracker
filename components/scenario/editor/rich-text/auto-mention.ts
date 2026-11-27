import { type Editor, Extension } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { Mark } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

import { MENTION_SUGGESTION_KEY } from './mention-suggestion';

import {
    type AutoMentionIndex,
    findAutoMentionAtEnd,
} from '@/lib/utils/scenario/auto-mentions';
import { UNTAGGABLE_MARKS } from '@/lib/utils/scenario/wrap-mentions';

type GetIndex = () => AutoMentionIndex | null;

type AutoMentionStorage = { index: AutoMentionIndex | null };

declare module '@tiptap/core' {
    interface Storage {
        autoMention: AutoMentionStorage;
    }
}

// apostrophes are left out: inside a Ukrainian word they belong to it
const BOUNDARY = /^[\s.,;:!?)»"…]$/u;

type Hit = { from: number; to: number; mention: () => void };

function findHit(view: EditorView, getIndex: GetIndex): Hit | null {
    const index = getIndex();

    const { state } = view;

    const { $from, empty } = state.selection;

    if (
        !index ||
        !empty ||
        view.composing ||
        !$from.parent.isTextblock ||
        MENTION_SUGGESTION_KEY.getState(state)?.active
    )
        return null;

    const start = $from.start();

    const hit = findAutoMentionAtEnd(
        index,
        state.doc.textBetween(start, $from.pos, '\n', '￼')
    );

    if (!hit) return null;

    const from = start + hit.from;

    const to = $from.pos;

    const blocked = UNTAGGABLE_MARKS.map((n) => state.schema.marks[n]).filter(
        Boolean
    );

    if (blocked.some((m) => state.doc.rangeHasMark(from, to, m))) return null;

    return {
        from,
        to,
        mention: () => {
            const current = view.state;

            const nodeMarks: (readonly Mark[])[] = [];

            current.doc.nodesBetween(from, to, (n) => {
                if (n.isText) nodeMarks.push(n.marks);
            });

            const common = nodeMarks.reduce((acc, ms) =>
                acc.filter((m) => ms.some((x) => x.eq(m)))
            );

            const node = current.schema.nodes.mention.create(
                {
                    id: hit.option.id,
                    label: hit.text,
                    type: hit.option.type,
                },
                null,
                common
            );

            view.dispatch(closeHistory(current.tr.replaceWith(from, to, node)));
        },
    };
}

// the index arrives async; it lives in storage so the editor is not rebuilt when it loads
export const AutoMention = Extension.create<object, AutoMentionStorage>({
    name: 'autoMention',
    addStorage: () => ({ index: null }),
    addProseMirrorPlugins() {
        const getIndex: GetIndex = () => this.storage.index;

        return [
            new Plugin({
                key: new PluginKey('autoMention'),
                props: {
                    handleTextInput(view, from, to, text) {
                        if (
                            !BOUNDARY.test(text) ||
                            from !== to ||
                            from !== view.state.selection.from
                        )
                            return false;

                        const hit = findHit(view, getIndex);

                        if (!hit) return false;

                        // the typed char goes in first so undo reverts only the chip
                        view.dispatch(view.state.tr.insertText(text, from, to));
                        hit.mention();

                        return true;
                    },
                    handleKeyDown(view, event) {
                        if (event.key === 'Enter' && !event.shiftKey)
                            findHit(view, getIndex)?.mention();

                        return false;
                    },
                },
            }),
        ];
    },
});

export function setAutoMentionIndex(
    editor: Editor,
    index: AutoMentionIndex | null
) {
    editor.storage.autoMention.index = index;
}
