'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { clamp } from '@/lib/utils/common/clamp';

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
            style={{ transform: `scaleX(${on ? clamp(ratio, 0, 1) : 0})` }}
        />
    );
}
