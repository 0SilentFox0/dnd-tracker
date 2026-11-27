// @vitest-environment happy-dom
import { cleanup, render, waitFor } from '@testing-library/react';
import type { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { RichTextEditor } from '@/components/scenario/editor/rich-text/RichTextEditor';
import type { RichDoc, RichNode } from '@/types/scenario';

afterEach(cleanup);

const doc = (...content: RichNode[]): RichDoc => ({
    type: 'doc',
    content: [{ type: 'paragraph', content }],
});

describe('RichTextEditor external doc updates', () => {
    it('keeps the caret near its place when the doc is replaced', async () => {
        let editor: Editor | null = null;

        const props = {
            onChange: () => {},
            onReady: (e: Editor | null) => {
                editor = e;
            },
            mentions: { search: async () => [], autoIndex: null },
            label: 'story',
        };

        const before = doc({ type: 'text', text: 'Zehir went home to rest' });

        const { rerender } = render(<RichTextEditor doc={before} {...props} />);

        await waitFor(() => expect(editor).not.toBeNull());

        const e = editor as unknown as Editor;

        e.commands.setTextSelection(12);

        rerender(
            <RichTextEditor
                doc={doc(
                    {
                        type: 'mention',
                        attrs: { id: 'c1', label: 'Zehir', type: 'character' },
                    },
                    { type: 'text', text: ' went home to rest' }
                )}
                {...props}
            />
        );

        await waitFor(() =>
            expect(e.state.doc.firstChild?.firstChild?.type.name).toBe(
                'mention'
            )
        );
        expect(e.state.selection.from).toBe(8);
    });
});
