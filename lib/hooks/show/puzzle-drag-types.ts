export interface DragState {
    id: string;
    clientX: number;
    clientY: number;
    rot: number;
    scale: number;
    grabbed: boolean;
    released: boolean;
    pointerId: number;
    origin: {
        clientX: number;
        clientY: number;
        board: { x: number; y: number } | null;
    };
}

export interface Origin {
    pointerId: number;
    clientX: number;
    clientY: number;
}

export const NON_PASSIVE: AddEventListenerOptions = { passive: false };

export const LONG_PRESS_MS = 200;

export const SCROLL_SLOP_PX = 8;
