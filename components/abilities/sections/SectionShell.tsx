import type { ReactNode } from 'react';

import { FLOW_BORDER, type FlowPart } from '../flow-part';
import { CollapsibleHeader } from './CollapsibleHeader';

import { cn } from '@/lib/utils';

export const sectionId = (path: string, part: FlowPart) =>
    `${path}-section-${part}`;

interface SectionShellProps {
    path: string;
    part: FlowPart;
    title: ReactNode;
    state: { open: boolean; onToggle: () => void; summary: string | null };
    add?: { onClick?: () => void; label: string };
    className?: string;
    children: ReactNode;
}

export function SectionShell({
    path,
    part,
    title,
    state,
    add,
    className,
    children,
}: SectionShellProps) {
    const id = sectionId(path, part);

    return (
        <div
            id={id}
            tabIndex={-1}
            className={cn(
                'space-y-2 rounded-sm border-l-2 pl-3 outline-none',
                FLOW_BORDER[part],
                className
            )}
        >
            <CollapsibleHeader
                title={title}
                summary={state.summary}
                open={state.open}
                onToggle={state.onToggle}
                onAdd={add?.onClick}
                addLabel={add?.label}
                controlsId={`${id}-body`}
            />
            {state.open && (
                <div id={`${id}-body`} className="space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
}
