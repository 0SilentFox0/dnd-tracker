'use client';

import { useEffect, useRef } from 'react';

type HotkeyItem = { key: string; run(): void; disabled: boolean };

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

            if (!/^[1-9]$/.test(event.key)) return;

            const item = items[Number(event.key) - 1];

            if (!item || item.disabled) return;

            event.preventDefault();

            item.run();
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [enabled]);
}
