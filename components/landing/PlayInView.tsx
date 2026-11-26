'use client';

import { type ReactNode, useEffect, useRef } from 'react';

// sets data-play while the element is on screen; CSS runs its animations only then
export function PlayInView({
    className,
    label,
    children,
}: {
    className?: string;
    label?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;

        if (!el || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(
            (entries) => {
                el.toggleAttribute(
                    'data-play',
                    entries[entries.length - 1]?.isIntersecting ?? false
                );
            },
            { threshold: 0.35 }
        );

        observer.observe(el);

        return () => {
            observer.disconnect();
            el.removeAttribute('data-play');
        };
    }, []);

    return (
        <div
            ref={ref}
            className={className}
            role={label ? 'group' : undefined}
            aria-label={label}
        >
            {children}
        </div>
    );
}
