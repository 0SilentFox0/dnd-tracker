'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import type { BattleMapEditor } from '@/lib/hooks/battles';
import { cn } from '@/lib/utils';
import type { SetupTool } from '@/lib/utils/battle/grid';

export const EDGE_TOOLS: SetupTool[] = [
    'edge-wall',
    'edge-bars',
    'edge-door',
    'edge-erase',
];

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
                <HudButton
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
                </HudButton>
            ))}
        </div>
    );
}

export function DoorToolOptions({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    const { tool, doorLocked } = editor.state;

    if (tool !== 'edge-door') return null;

    return (
        <div className="space-y-2">
            <OnboardingHint id="battle.map-doors" />
            <HudButton
                type="button"
                aria-pressed={doorLocked}
                onClick={() => editor.actions.setDoorLocked(!doorLocked)}
                className={cn(
                    'h-8 rounded-md border bg-black/30 px-3 text-sm hover:bg-black/50',
                    doorLocked
                        ? 'border-[var(--gold)] text-hud-gold-bright'
                        : 'border-hud-rule text-hud-muted'
                )}
            >
                {t('doorLocked')}
            </HudButton>
        </div>
    );
}
