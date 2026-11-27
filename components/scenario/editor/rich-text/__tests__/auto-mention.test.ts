// @vitest-environment happy-dom
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { buildExtensions } from '@/components/scenario/editor/rich-text/extensions';
import {
    type AutoMentionIndex,
    buildAutoMentionIndex,
} from '@/lib/utils/scenario/auto-mentions';
import type { RichDoc } from '@/types/scenario';

let editor: Editor | null = null;

afterEach(() => editor?.destroy());

const index = buildAutoMentionIndex([
    { type: 'character', id: 'c1', label: 'Зехір' },
    { type: 'unit', id: 'u1', label: 'Привид' },
    { type: 'acquaintance', id: 'a1', label: 'Привид' },
    { type: 'unit', id: 'u2', label: 'Імп' },
    { type: 'character', id: 'k1', label: 'Кха' },
]);

function mount(autoIndex: AutoMentionIndex | null) {
    editor?.destroy();
    editor = new Editor({
        element: document.createElement('div'),
        extensions: buildExtensions(async () => []),
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });
    editor.storage.autoMention.index = autoIndex;
    editor.commands.focus('end');

    return editor;
}

function type(e: Editor, s: string) {
    const { view } = e;

    for (const ch of s) {
        const { from, to } = view.state.selection;

        const handled = view.someProp('handleTextInput', (f) =>
            f(view, from, to, ch, () => view.state.tr.insertText(ch, from, to))
        );

        if (!handled) view.dispatch(view.state.tr.insertText(ch));
    }
}

function pressEnter(e: Editor) {
    const { view } = e;

    const event = new KeyboardEvent('keydown', { key: 'Enter' });

    if (!view.someProp('handleKeyDown', (f) => f(view, event)))
        e.commands.enter();
}

const inline = (e: Editor) =>
    ((e.getJSON() as RichDoc).content[0].content ?? []).map((n) =>
        n.type === 'mention' ? `[${String(n.attrs?.label)}]` : n.text
    );

describe('live auto-mentions', () => {
    it('turns a finished name into a chip and keeps the typed space', () => {
        const e = mount(index);

        type(e, 'Бачу Зехір ');

        expect(inline(e)).toEqual(['Бачу ', '[Зехір]', ' ']);
        expect(
            (e.getJSON() as RichDoc).content[0].content?.[1].attrs
        ).toMatchObject({ id: 'c1', type: 'character' });
    });

    it('undo restores the plain text', () => {
        const e = mount(index);

        type(e, 'Бачу Зехір ');
        e.commands.undo();

        expect(inline(e).join('')).toBe('Бачу Зехір ');
        expect(inline(e).some((s) => s?.startsWith('['))).toBe(false);
    });

    it('converts on punctuation with a case ending', () => {
        const e = mount(index);

        type(e, 'Зехіра,');

        expect(inline(e)).toEqual(['[Зехіра]', ',']);
    });

    it('converts on Enter', () => {
        const e = mount(index);

        type(e, 'Зехір');
        pressEnter(e);

        expect(inline(e)).toEqual(['[Зехір]']);
        expect((e.getJSON() as RichDoc).content).toHaveLength(2);
    });

    it('does nothing without an index, for ambiguous names or after @', () => {
        const e = mount(null);

        type(e, 'Зехір ');
        expect(inline(e)).toEqual(['Зехір ']);

        const f = mount(index);

        type(f, 'Привид @Зехір ');
        expect(inline(f).some((s) => s?.startsWith('['))).toBe(false);
    });

    it('does not convert while the @ suggestion is open', () => {
        const e = mount(index);

        type(e, 'x @Old-Імп');
        pressEnter(e);

        expect(
            (e.getJSON() as RichDoc).content
                .flatMap((b) => b.content ?? [])
                .some((n) => n.type === 'mention' && n.attrs?.id === 'u2')
        ).toBe(false);
    });

    it('leaves composition input to the browser', () => {
        const e = mount(index);

        type(e, 'Зехір');

        const { view } = e;

        Object.defineProperty(view, 'composing', { value: true });

        const { from, to } = view.state.selection;

        const handled = view.someProp('handleTextInput', (f) =>
            f(view, from, to, ' ', () => view.state.tr)
        );

        expect(handled).toBeFalsy();
    });

    it('converts on a dash, slash or opening bracket', () => {
        for (const ch of ['—', '/', '(', '”']) {
            const e = mount(index);

            type(e, `Зехір${ch}`);
            expect(inline(e)[0]).toBe('[Зехір]');
        }
    });

    it('converts on Tab and on blur', () => {
        const e = mount(index);

        type(e, 'Зехір');
        e.view.someProp('handleKeyDown', (f) =>
            f(e.view, new KeyboardEvent('keydown', { key: 'Tab' }))
        );
        expect(inline(e)).toEqual(['[Зехір]']);

        const f = mount(index);

        type(f, 'Зехір');
        f.view.someProp('handleDOMEvents', (h) =>
            h.blur?.(f.view, new FocusEvent('blur'))
        );
        expect(inline(f)).toEqual(['[Зехір]']);
    });

    it('does not convert on a hyphen inside a word', () => {
        const e = mount(index);

        type(e, 'Кха-Белех ');

        expect(inline(e).some((s) => s?.startsWith('['))).toBe(false);
    });

    it('after Enter, undo first removes the new text, then the chip', () => {
        const e = mount(index);

        type(e, 'Зехір');
        pressEnter(e);
        type(e, 'далі');

        const blocks = () =>
            (e.getJSON() as RichDoc).content.map((b) =>
                (b.content ?? [])
                    .map((n) =>
                        n.type === 'mention'
                            ? `[${String(n.attrs?.label)}]`
                            : n.text
                    )
                    .join('')
            );

        expect(blocks()).toEqual(['[Зехір]', 'далі']);
        e.commands.undo();
        expect(blocks()).toEqual(['[Зехір]', '']);
        e.commands.undo();
        expect(blocks()[0]).toBe('Зехір');
    });
});
