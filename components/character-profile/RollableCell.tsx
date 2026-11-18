import type { ReactNode } from 'react';

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
        <button
            type="button"
            title={title}
            aria-label={ariaLabel}
            onClick={onRoll}
            className={className}
        >
            {children}
        </button>
    ) : (
        <div className={className}>{children}</div>
    );
}
