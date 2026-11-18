import type { ReactNode } from 'react';

export function RollResultView({
    total,
    detail,
    children,
}: {
    total: ReactNode;
    detail: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div aria-live="polite" className="text-center">
            <div className="text-4xl font-bold text-hud-gold-bright tabular-nums">
                {total}
            </div>
            <div className="text-xs text-hud-muted">{detail}</div>
            {children}
        </div>
    );
}
