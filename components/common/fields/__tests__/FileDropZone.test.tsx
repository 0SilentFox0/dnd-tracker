// @vitest-environment happy-dom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileDropZone } from '../FileDropZone';

afterEach(cleanup);

const json = new File(['{}'], 'a.json', { type: 'application/json' });

const drop = (el: Element, files: File[]) => {
    const event = createEvent.drop(el, { dataTransfer: { files } });

    fireEvent(el, event);
};

describe('FileDropZone', () => {
    it('passes a dropped file to onFile', () => {
        const onFile = vi.fn();

        const { container } = render(
            <FileDropZone accept=".json" onFile={onFile} label="Drop" />
        );

        drop(container.firstElementChild as Element, [json]);

        expect(onFile).toHaveBeenCalledWith(json);
    });

    it('is a button that opens the file input', () => {
        const click = vi.spyOn(HTMLInputElement.prototype, 'click');

        render(<FileDropZone accept=".json" onFile={vi.fn()} label="Drop" />);

        const zone = screen.getByRole('button', { name: 'Drop' });

        expect(zone.tagName).toBe('BUTTON');

        fireEvent.click(zone);

        expect(click).toHaveBeenCalled();

        click.mockRestore();
    });

    it('ignores drops while disabled', () => {
        const onFile = vi.fn();

        const { container } = render(
            <FileDropZone accept=".json" onFile={onFile} label="Drop" disabled />
        );

        drop(container.firstElementChild as Element, [json]);

        expect(onFile).not.toHaveBeenCalled();
    });

    it('shows the file card with size and a replace action', () => {
        render(
            <FileDropZone
                accept=".json"
                onFile={vi.fn()}
                label="Drop"
                file={{
                    name: 'srd.json',
                    size: 2048,
                    meta: 'classic',
                    replaceLabel: 'Replace',
                }}
            />
        );

        expect(screen.getByText('srd.json')).toBeTruthy();
        expect(screen.getByText(/2KB/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Replace' })).toBeTruthy();
    });
});
