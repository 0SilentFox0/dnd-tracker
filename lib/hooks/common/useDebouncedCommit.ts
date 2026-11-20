'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCommit<T>(commit: (value: T) => void, ms = 400) {
    const commitRef = useRef(commit);

    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const pending = useRef<{ value: T } | null>(null);

    useEffect(() => {
        commitRef.current = commit;
    });

    const flush = useCallback(() => {
        clearTimeout(timer.current);

        const next = pending.current;

        if (next === null) return;

        pending.current = null;
        commitRef.current(next.value);
    }, []);

    const schedule = useCallback(
        (value: T) => {
            pending.current = { value };
            clearTimeout(timer.current);
            timer.current = setTimeout(flush, ms);
        },
        [flush, ms]
    );

    useEffect(() => flush, [flush]);

    return { schedule, flush };
}
