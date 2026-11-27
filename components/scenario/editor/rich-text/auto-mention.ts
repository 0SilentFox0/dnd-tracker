import { type Editor, Extension } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { Mark } from '@tiptap/pm/model';
import {
    type EditorState,
    Plugin,
    PluginKey,
    type Transaction,
} from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

import { MENTION_SUGGESTION_KEY } from './mention-suggestion';

import {
    type AutoMentionIndex,
    findAutoMentionAtEnd,
} from '@/lib/utils/scenario/auto-mentions';
import { UNTAGGABLE_MARKS } from '@/lib/utils/scenario/wrap-mentions';
import type { MentionOption } from '@/types/scenario';

type GetIndex = () => AutoMentionIndex | null;

type AutoMentionStorage = { index: AutoMentionIndex | null };

declare module '@tiptap/core' {
    interface Storage {
        autoMention: AutoMentionStorage;
    }
}

// apostrophes and hyphens are left out: inside a Ukrainian word or a compound they belong to it
const BOUNDARY = /^[\s.,;:!?()»“”"…\u2013\u2014/]$/u;

type Hit = { from: number; to: number; text: string; option: MentionOption };

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

    // inline content maps 1:1 to chars, so only the tail a name can span is read (+1 char for the boundary check)
    const start = Math.max($from.start(), $from.pos - index.maxSpan - 1);

    const hit = findAutoMentionAtEnd(
        index,
        state.doc.textBetween(start, $from.pos, '\n', '￼')
    );

    if (!hit) return null;

    const from = start + hit.index;

    const to = $from.pos;

    if (
        UNTAGGABLE_MARKS.some((n) => {
            const mark = state.schema.marks[n];

            return mark && state.doc.rangeHasMark(from, to, mark);
        })
    )
        return null;

    return { from, to, text: hit.text, option: hit.option };
}

// null when the range no longer holds the matched text
function chipTransaction(
    state: EditorState,
    hit: Hit,
    from: number,
    to: number
): Transaction | null {
    if (state.doc.textBetween(from, to) !== hit.text) return null;

    const nodeMarks: (readonly Mark[])[] = [];

    state.doc.nodesBetween(from, to, (n) => {
        if (n.isText) nodeMarks.push(n.marks);
    });

    const [first = [], ...rest] = nodeMarks;

    const common = first.filter((m) => rest.every((ms) => m.isInSet(ms)));

    const node = state.schema.nodes.mention.create(
        { id: hit.option.id, label: hit.text, type: hit.option.type },
        null,
        common
    );

    // its own undo step, so Ctrl+Z turns the chip back into text
    return closeHistory(state.tr.replaceWith(from, to, node));
}

function convertNow(view: EditorView, getIndex: GetIndex) {
    const hit = findHit(view, getIndex);

    const tr = hit && chipTransaction(view.state, hit, hit.from, hit.to);

    if (tr) view.dispatch(tr);
}

// the index arrives async; it lives in storage so the editor is not rebuilt when it loads
export const AutoMention = Extension.create<object, AutoMentionStorage>({
    name: 'autoMention',
    addStorage: () => ({ index: null }),
    addProseMirrorPlugins() {
        const getIndex: GetIndex = () => this.storage.index;

        // on Enter the chip is made after the split, so text typed on the new line is a separate undo step
        let afterEnter: Hit | null = null;

        return [
            new Plugin({
                key: new PluginKey('autoMention'),
                appendTransaction(trs, _old, state) {
                    const hit = afterEnter;

                    if (!hit || !trs.some((tr) => tr.docChanged)) return null;

                    afterEnter = null;

                    const from = trs.reduce(
                        (pos, tr) => tr.mapping.map(pos, 1),
                        hit.from
                    );

                    const to = trs.reduce(
                        (pos, tr) => tr.mapping.map(pos, -1),
                        hit.to
                    );

                    return chipTransaction(state, hit, from, to);
                },
                props: {
                    handleTextInput(view, from, to, text) {
                        afterEnter = null;

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

                        const chip = chipTransaction(
                            view.state,
                            hit,
                            hit.from,
                            hit.to
                        );

                        if (chip) view.dispatch(chip);

                        return true;
                    },
                    handleDOMEvents: {
                        blur(view) {
                            convertNow(view, getIndex);

                            return false;
                        },
                    },
                    handleKeyDown(view, event) {
                        afterEnter = null;

                        if (event.shiftKey) return false;

                        if (event.key === 'Enter')
                            afterEnter = findHit(view, getIndex);
                        else if (event.key === 'Tab')
                            convertNow(view, getIndex);

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
