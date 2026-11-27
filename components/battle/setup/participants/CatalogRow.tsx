'use client';

import { useTranslations } from 'next-intl';
import { Minus, Plus, Shield, Swords, X } from 'lucide-react';

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
                variant="outline"
                size="sm"
                aria-label={t('addAlly', { name })}
                onClick={() => add(ParticipantSide.ALLY)}
            >
                <Shield className="text-hud-accent-fg" aria-hidden />
                <span className="sr-only">{t('ally')}</span>
            </Button>
            <Button
                type="button"
                variant="outline"
                size="sm"
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
            className="flex items-center"
        >
            <HudIconButton
                aria-label={t('quantityLess', { name })}
                disabled={value <= UNIT_QUANTITY.min}
                onClick={() => onChange(clampUnitQuantity(value - 1))}
            >
                <Minus className="size-3.5" aria-hidden />
            </HudIconButton>
            <span
                className="hud-num w-7 text-center text-sm tabular-nums"
                aria-live="polite"
            >
                {value}
            </span>
            <HudIconButton
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
                'relative flex min-w-0 flex-col items-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-hud-panel-2/70',
                state && 'bg-hud-panel-2'
            )}
        >
            {state && (
                <span
                    aria-hidden
                    className={cn(
                        'absolute inset-x-3 top-0 h-[3px] rounded-full',
                        isEnemy ? 'bg-hud-crimson' : 'bg-hud-accent'
                    )}
                />
            )}
            <HudButton
                aria-pressed={!!state}
                onClick={() =>
                    state ? actions.remove() : actions.add(defaultSide)
                }
                className="flex w-full min-w-0 flex-col items-center gap-1.5 rounded-lg text-center"
            >
                <EntityIcon
                    src={entity.avatar}
                    name={entity.name}
                    alt=""
                    size={72}
                    className="size-[72px] rounded-lg"
                />
                <span className="block w-full min-w-0">
                    <span className="block truncate text-sm font-medium">
                        {entity.name}
                    </span>
                    {stats && (
                        <span className="hud-num block truncate text-xs text-hud-muted tabular-nums">
                            {round1(stats.dpr)} · {stats.hp} · {stats.kpi}
                        </span>
                    )}
                </span>
            </HudButton>
            <div className="flex flex-wrap items-center justify-center gap-1">
                {state ? (
                    <>
                        <SideToggle
                            side={state.side}
                            onChange={actions.setSide}
                            label={t('sideAria', { name: entity.name })}
                            size="sm"
                        />
                        {kind === 'unit' && (
                            <QuantityStepper
                                name={entity.name}
                                value={state.quantity ?? 1}
                                onChange={actions.setQuantity}
                            />
                        )}
                        <HudIconButton
                            tone="muted"
                            aria-label={t('remove', { name: entity.name })}
                            onClick={actions.remove}
                        >
                            <X className="size-4" aria-hidden />
                        </HudIconButton>
                    </>
                ) : (
                    <AddButtons name={entity.name} add={actions.add} />
                )}
            </div>
        </div>
    );
}
