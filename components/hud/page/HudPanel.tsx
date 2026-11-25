import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function HudPanel({
    as: Tag = 'section',
    className,
    children,
    'data-tour': dataTour,
}: {
    as?: 'section' | 'div';
    className?: string;
    children: ReactNode;
    'data-tour'?: string;
}) {
    return (
        <Tag
            className={cn('ds-panel p-4 sm:px-5', className)}
            data-tour={dataTour}
        >
            {children}
        </Tag>
    );
}
