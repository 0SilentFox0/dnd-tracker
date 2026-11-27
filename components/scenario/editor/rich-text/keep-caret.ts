import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

// every leaf counts as at least one char, so a caret right after a hard break or token keeps its place
const leafText = (node: PMNode) =>
    node.type.name === 'mention' ? String(node.attrs.label ?? '') : '\ufffc';

const textBefore = (doc: PMNode, pos: number) =>
    doc.textBetween(0, pos, '\n', leafText).length;

// replaces the doc and puts the caret after the same amount of text, so chips created around it do not throw it to the end
export function setContentKeepingCaret(editor: Editor, content: object) {
    const offset = textBefore(editor.state.doc, editor.state.selection.from);

    editor.commands.setContent(content, { emitUpdate: false });

    const { doc } = editor.state;

    let lo = 0;

    let hi = doc.content.size;

    while (lo < hi) {
        const mid = (lo + hi) >> 1;

        if (textBefore(doc, mid) < offset) lo = mid + 1;
        else hi = mid;
    }

    editor.commands.command(({ tr }) => {
        tr.setSelection(TextSelection.near(tr.doc.resolve(lo)));

        return true;
    });
}
