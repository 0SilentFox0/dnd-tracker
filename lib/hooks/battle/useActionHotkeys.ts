'use client';

import { useEffect, useRef } from 'react';

type HotkeyItem = {
    key: string;
    run(): void;
    alt?(): void;
    disabled: boolean;
};

const TYPING = 'input, textarea, select, [contenteditable]';

export function useActionHotkeys(opts: {
    enabled: boolean;
    items: HotkeyItem[];
    close(): void;
}): void {
    const ref = useRef(opts);

    const { enabled } = opts;

    useEffect(() => {
        ref.current = opts;
    });

    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
                return;

            const target = event.target as Element | null;

            if (target?.closest?.(TYPING)) return;

            const { items, close } = ref.current;

            if (event.code === 'KeyQ' || event.key.toLowerCase() === 'q') {
                close();

                return;
            }

            const digit = /^[1-9]$/.test(event.key)
                ? event.key
                : /^Digit[1-9]$/.test(event.code)
                  ? event.code.slice(5)
                  : null;

            if (!digit) return;

            const item = items[Number(digit) - 1];

            if (!item || item.disabled) return;

            event.preventDefault();

            if (event.shiftKey && item.alt) item.alt();
            else item.run();
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [enabled]);
}
