import type { ReactNode } from 'react';

import './charts.css';
import { HudPanel } from '@/components/hud/page';

export function ChartPanel({
    title,
    empty,
    emptyText,
    children,
}: {
    title: string;
    empty?: boolean;
    emptyText?: string;
    children: ReactNode;
}) {
    return (
        <HudPanel as="div" className="admin-chart min-w-0 space-y-3">
            <h3 className="hud-sc text-sm">{title}</h3>
            {empty ? (
                <p className="py-10 text-center text-sm text-hud-muted">
                    {emptyText}
                </p>
            ) : (
                children
            )}
        </HudPanel>
    );
}
