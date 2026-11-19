import type { ReactNode } from 'react';

import { HudButton } from '@/components/hud';

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
        <HudButton
            type="button"
            title={title}
            aria-label={ariaLabel}
            onClick={onRoll}
            className={className}
        >
            {children}
        </HudButton>
    ) : (
        <div className={className}>{children}</div>
    );
}
