'use client';

import { useTranslations } from 'next-intl';
import { Shield, Swords } from 'lucide-react';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { cn } from '@/lib/utils';
import type { BattleSideSummary } from '@/types/battle';

function Side({
    summary,
    kind,
    compact,
}: {
    summary: BattleSideSummary;
    kind: 'ally' | 'enemy';
    compact: boolean;
}) {
    const Icon = kind === 'ally' ? Shield : Swords;

    return (
        <span className="flex min-w-0 items-center gap-1.5">
            <Icon
                aria-hidden
                className={cn(
                    'size-4 shrink-0',
                    kind === 'ally' ? 'text-hud-accent-fg' : 'text-hud-muted'
                )}
            />
            <span className="flex -space-x-2">
                {summary.faces.map((face) => (
                    <EntityIcon
                        key={face.id}
                        src={face.avatar}
                        name={face.name}
                        size={compact ? 20 : 28}
                        className={cn(
                            'rounded-full ring-2 ring-hud-panel',
                            compact ? 'size-5' : 'size-7'
                        )}
                    />
                ))}
            </span>
            <span className="text-sm text-hud-bone tabular-nums">
                {summary.count}
            </span>
        </span>
    );
}

export function SidesStrip({
    sides,
    compact = false,
}: {
    sides: { ally: BattleSideSummary; enemy: BattleSideSummary };
    compact?: boolean;
}) {
    const t = useTranslations('battleSetup.list.card');

    return (
        <div
            role="img"
            aria-label={t('sides', {
                ally: sides.ally.count,
                enemy: sides.enemy.count,
            })}
            className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"
        >
            <Side summary={sides.ally} kind="ally" compact={compact} />
            <span aria-hidden className="hud-sc text-xs text-hud-muted">
                VS
            </span>
            <Side summary={sides.enemy} kind="enemy" compact={compact} />
        </div>
    );
}
