'use client';

import { type CSSProperties, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function ScaleFill({
    ratio,
    className,
}: {
    ratio: number;
    className?: string;
}) {
    const [on, setOn] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setOn(true));

        return () => cancelAnimationFrame(id);
    }, []);

    return (
        <div
            aria-hidden
            className={cn(
                'motion-bar absolute inset-0 rounded-[inherit]',
                className
            )}
            style={{ transform: `scaleX(${on ? clamp(ratio) : 0})` }}
        />
    );
}

export const stagger = (i: number) => ({ '--i': i }) as CSSProperties;
