import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

export function RollableCell({
    canRoll,
    onRoll,
    title,
    ariaLabel,
    className,
    children,
}: {
    canRoll: boolean;
    onRoll: () => void;
    title: string;
    ariaLabel?: string;
    className?: string;
    children: ReactNode;
}) {
    return canRoll ? (
        <Button
            variant="bare"
            type="button"
            title={title}
            aria-label={ariaLabel}
            onClick={onRoll}
            className={className}
        >
            {children}
        </Button>
    ) : (
        <div className={className}>{children}</div>
    );
}
