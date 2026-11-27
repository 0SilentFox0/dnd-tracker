import type { ReactNode } from 'react';

import { HudButton } from '@/components/hud';

export function RollableCell({
    canRoll,
    onRoll,
    title,
    ariaLabel,
    className,
    tile,
    children,
}: {
    canRoll: boolean;
    onRoll: () => void;
    title: string;
    ariaLabel?: string;
    className?: string;
    tile?: boolean;
    children: ReactNode;
}) {
    return canRoll ? (
        <HudButton
            type="button"
            title={title}
            aria-label={ariaLabel}
            onClick={onRoll}
            data-ux-tile={tile || undefined}
            className={className}
        >
            {children}
        </HudButton>
    ) : (
        <div className={className}>{children}</div>
    );
}
