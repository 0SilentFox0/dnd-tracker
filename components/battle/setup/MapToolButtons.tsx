'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { SetupTool } from '@/lib/utils/battle/grid';

export const EDGE_TOOLS: SetupTool[] = ['edge-wall', 'edge-bars', 'edge-erase'];

export function ToolButtons({
    tools,
    tool,
    onPick,
}: {
    tools: SetupTool[];
    tool: SetupTool | null;
    onPick: (tool: SetupTool | null) => void;
}) {
    const t = useTranslations('battleSetup.map');

    return (
        <div className="flex flex-wrap gap-1.5">
            {tools.map((value) => (
                <button
                    key={value}
                    type="button"
                    aria-pressed={tool === value}
                    onClick={() => onPick(tool === value ? null : value)}
                    className={cn(
                        'h-8 rounded-md border bg-black/30 px-3 text-sm hover:bg-black/50',
                        tool === value
                            ? 'border-[var(--gold)] text-hud-gold-bright'
                            : 'border-hud-rule text-hud-muted'
                    )}
                >
                    {t(`tools.${value}`)}
                </button>
            ))}
        </div>
    );
}
