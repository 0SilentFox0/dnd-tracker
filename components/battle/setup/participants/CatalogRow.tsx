'use client';

import { useTranslations } from 'next-intl';
import { Minus, Plus, Shield, Swords } from 'lucide-react';

import { SideToggle } from './SideToggle';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudButton, HudIconButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { ParticipantSide } from '@/lib/constants/battle';
import { clampUnitQuantity, UNIT_QUANTITY } from '@/lib/constants/battle-units';
import { cn } from '@/lib/utils';
import { round1 } from '@/lib/utils/common/format';
import type { EntityStats } from '@/types/battle-setup';

export interface CatalogActions {
    add: (side: ParticipantSide) => void;
    setSide: (side: ParticipantSide) => void;
    setQuantity: (quantity: number) => void;
    remove: () => void;
}

interface CatalogRowProps {
    entity: { id: string; name: string; avatar: string | null };
    kind: 'hero' | 'unit';
    stats: EntityStats | null;
    state: { side: ParticipantSide; quantity?: number } | null;
    actions: CatalogActions;
}

function AddButtons({
    name,
    add,
}: {
    name: string;
    add: CatalogActions['add'];
}) {
    const t = useTranslations('battleSetup.participants');

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-full rounded-none hover:bg-hud-accent/15"
                aria-label={t('addAlly', { name })}
                onClick={() => add(ParticipantSide.ALLY)}
            >
                <Shield className="text-hud-accent-fg" aria-hidden />
                <span className="sr-only">{t('ally')}</span>
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-full rounded-none hover:bg-hud-crimson/15"
                aria-label={t('addEnemy', { name })}
                onClick={() => add(ParticipantSide.ENEMY)}
            >
                <Swords className="text-hud-crimson-fg" aria-hidden />
                <span className="sr-only">{t('enemy')}</span>
            </Button>
        </>
    );
}

function QuantityStepper({
    name,
    value,
    onChange,
}: {
    name: string;
    value: number;
    onChange: (quantity: number) => void;
}) {
    const t = useTranslations('battleSetup.participants');

    return (
        <div
            role="group"
            aria-label={t('quantityAria', { name })}
            className="flex min-w-0 flex-1 items-center justify-center border-l border-hud-rule"
        >
            <HudIconButton
                className="h-9 w-7"
                aria-label={t('quantityLess', { name })}
                disabled={value <= UNIT_QUANTITY.min}
                onClick={() => onChange(clampUnitQuantity(value - 1))}
            >
                <Minus className="size-3.5" aria-hidden />
            </HudIconButton>
            <span
                className="hud-num w-5 text-center text-sm tabular-nums"
                aria-live="polite"
            >
                {value}
            </span>
            <HudIconButton
                className="h-9 w-7"
                aria-label={t('quantityMore', { name })}
                disabled={value >= UNIT_QUANTITY.max}
                onClick={() => onChange(clampUnitQuantity(value + 1))}
            >
                <Plus className="size-3.5" aria-hidden />
            </HudIconButton>
        </div>
    );
}

export function CatalogRow({
    entity,
    kind,
    stats,
    state,
    actions,
}: CatalogRowProps) {
    const t = useTranslations('battleSetup.participants');

    const defaultSide =
        kind === 'hero' ? ParticipantSide.ALLY : ParticipantSide.ENEMY;

    const isEnemy = state?.side === ParticipantSide.ENEMY;

    return (
        <div
            data-selected={state ? 'true' : undefined}
            className={cn(
                'group/tile relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-hud-panel-2/50 transition-all',
                'hover:-translate-y-0.5 hover:bg-hud-panel-2 hover:shadow-lg',
                !state && 'border-hud-rule',
                state &&
                    isEnemy &&
                    'border-hud-crimson bg-hud-panel-2 shadow-[0_0_0_1px_var(--hud-crimson)]',
                state &&
                    !isEnemy &&
                    'border-hud-accent bg-hud-panel-2 shadow-[0_0_0_1px_var(--hud-accent)]'
            )}
        >
            <HudButton
                aria-pressed={!!state}
                onClick={() => !state && actions.add(defaultSide)}
                className="flex w-full min-w-0 flex-col items-center gap-2 px-2.5 pt-2.5 pb-2 text-center"
            >
                <EntityIcon
                    src={entity.avatar}
                    name={entity.name}
                    alt=""
                    size={160}
                    className="aspect-square h-auto w-full rounded-lg bg-black/30 ring-1 ring-hud-rule transition-transform group-hover/tile:scale-[1.02]"
                />
                <span className="block w-full truncate text-sm font-semibold">
                    {entity.name}
                </span>
                {stats && (
                    <span className="hud-num grid w-full grid-cols-3 divide-x divide-hud-rule rounded-md bg-black/20 py-1 tabular-nums">
                        {[
                            ['DPR', round1(stats.dpr)],
                            ['HP', stats.hp],
                            ['KPI', stats.kpi],
                        ].map(([label, value]) => (
                            <span key={label} className="flex flex-col">
                                <span className="text-[9px] tracking-wider text-hud-muted uppercase">
                                    {label}
                                </span>
                                <span className="text-xs font-medium">
                                    {value}
                                </span>
                            </span>
                        ))}
                    </span>
                )}
            </HudButton>
            <div
                className={cn(
                    'border-t border-hud-rule',
                    state
                        ? 'flex h-[37px] items-stretch'
                        : 'grid grid-cols-2 divide-x divide-hud-rule'
                )}
            >
                {state ? (
                    <>
                        <SideToggle
                            side={state.side}
                            onChange={(side) =>
                                side === state.side
                                    ? actions.remove()
                                    : actions.setSide(side)
                            }
                            label={t('sideAria', { name: entity.name })}
                            size="sm"
                            layout={kind === 'unit' ? 'compact' : 'fill'}
                        />
                        {kind === 'unit' && (
                            <QuantityStepper
                                name={entity.name}
                                value={state.quantity ?? 1}
                                onChange={actions.setQuantity}
                            />
                        )}
                    </>
                ) : (
                    <AddButtons name={entity.name} add={actions.add} />
                )}
            </div>
        </div>
    );
}
