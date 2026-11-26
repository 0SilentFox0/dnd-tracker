// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileDropZone } from '@/components/common/fields/FileDropZone';

afterEach(cleanup);

const png = (name: string) => new File(['x'], name, { type: 'image/png' });

function drop(files: File[]) {
    fireEvent.drop(screen.getByTestId('file-drop-zone'), {
        dataTransfer: { files },
    });
}

describe('FileDropZone', () => {
    it('passes only the first file when multiple is off', () => {
        const onFiles = vi.fn();

        render(<FileDropZone accept=".png" onFiles={onFiles} label="Pick" />);
        drop([png('a.png'), png('b.png')]);

        expect(onFiles).toHaveBeenCalledWith([expect.objectContaining({ name: 'a.png' })]);
    });

    it('passes all files when multiple is on', () => {
        const onFiles = vi.fn();

        render(<FileDropZone accept=".png" onFiles={onFiles} label="Pick" multiple />);
        drop([png('a.png'), png('b.png')]);

        expect(onFiles.mock.calls[0][0]).toHaveLength(2);
    });

    it('drops files with a rejected extension', () => {
        const onFiles = vi.fn();

        render(<FileDropZone accept=".png" onFiles={onFiles} label="Pick" />);
        drop([new File(['x'], 'a.exe', { type: 'application/x-msdownload' })]);

        expect(onFiles).not.toHaveBeenCalled();
    });

    it('accepts by MIME wildcard', () => {
        const onFiles = vi.fn();

        render(<FileDropZone accept="image/*" onFiles={onFiles} label="Pick" />);
        drop([png('a.png')]);

        expect(onFiles).toHaveBeenCalledTimes(1);
    });

    it('ignores drops when disabled', () => {
        const onFiles = vi.fn();

        render(<FileDropZone accept=".png" onFiles={onFiles} label="Pick" disabled />);
        drop([png('a.png')]);

        expect(onFiles).not.toHaveBeenCalled();
    });

    it('opens the file picker from the keyboard-reachable button', () => {
        const click = vi.spyOn(HTMLInputElement.prototype, 'click');

        render(<FileDropZone accept=".png" onFiles={vi.fn()} label="Pick" />);
        fireEvent.click(screen.getByRole('button', { name: 'Pick' }));

        expect(click).toHaveBeenCalled();
        click.mockRestore();
    });

    it('shows a file card with a replace action', () => {
        const onReplace = vi.fn();

        render(
            <FileDropZone
                accept=".png"
                onFiles={vi.fn()}
                label="Pick"
                file={{ name: 'map.png', size: 2048, replaceLabel: 'Replace', onReplace }}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Replace' }));

        expect(screen.getByText('map.png')).toBeTruthy();
        expect(onReplace).toHaveBeenCalled();
    });
});
