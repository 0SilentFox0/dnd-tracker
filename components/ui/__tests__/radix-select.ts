import { fireEvent, screen } from '@testing-library/react';

Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => {},
    setPointerCapture: () => {},
    scrollIntoView: () => {},
});

export async function pickOption(trigger: HTMLElement, name: string | RegExp) {
    fireEvent.pointerDown(trigger, {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('option', { name }));
}

export async function listOptions(trigger: HTMLElement) {
    fireEvent.pointerDown(trigger, {
        button: 0,
        ctrlKey: false,
        pointerType: 'mouse',
    });

    return screen.findAllByRole('option');
}
