'use client';

import { useLocale, useTranslations } from 'next-intl';

import { SetupEntityCard } from './SetupEntityCard';

import { SearchInput } from '@/components/common/SearchInput';
import { HudSection } from '@/components/hud/form';
import { HudChipTabs } from '@/components/hud/page';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ParticipantSide, ParticipantSourceType } from '@/lib/constants/battle';
import { clampUnitQuantity, UNIT_QUANTITY } from '@/lib/constants/battle-units';
import { groupDisplayName } from '@/lib/constants/ungrouped';
import {
    type ParticipantActions,
    type ParticipantSelection,
    useSetupUnitsFilter,
} from '@/lib/hooks/battles';
import type { EntityStats, SetupUnit } from '@/types/battle-setup';

interface UnitsListCardProps {
    units: SetupUnit[];
    entityStats: Record<string, EntityStats> | null;
    selection: ParticipantSelection;
    actions: Pick<
        ParticipantActions,
        'cycleUnit' | 'addToSide' | 'setQuantity'
    >;
}

interface UnitRowProps {
    unit: SetupUnit;
    stats: EntityStats | undefined;
    state: {
        isSelected: boolean;
        side: ParticipantSide | null;
        quantity: number;
    };
    actions: {
        onToggle: () => void;
        onAddToEnemies: () => void;
        onQuantityChange: (value: number) => void;
    };
}

function UnitRow({ unit, stats, state, actions }: UnitRowProps) {
    const t = useTranslations('battleSetup.units');

    const { isSelected, side, quantity } = state;

    const isEnemy = side === ParticipantSide.ENEMY;

    const badge = isEnemy ? (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
            {t('enemy')}
        </span>
    ) : side === ParticipantSide.ALLY ? (
        <span className="text-xs font-medium text-primary">{t('ally')}</span>
    ) : null;

    return (
        <SetupEntityCard
            entity={unit}
            fallbackIcon="⚔️"
            title={
                <span className="font-normal text-muted-foreground">
                    {' '}
                    · {t('tier', { level: unit.level ?? 1 })}
                </span>
            }
            stats={stats}
            state={{ isSelected, isEnemy, badge }}
            onToggle={actions.onToggle}
        >
            <div className="flex flex-wrap items-center gap-3 border-t border-border/50 px-4 pt-0 pb-4">
                <div className="flex items-center gap-2">
                    <label
                        htmlFor={`quantity-${unit.id}`}
                        className="text-sm whitespace-nowrap text-muted-foreground"
                    >
                        {t('quantity')}
                    </label>
                    <Input
                        id={`quantity-${unit.id}`}
                        type="number"
                        min={UNIT_QUANTITY.min}
                        max={UNIT_QUANTITY.max}
                        value={quantity}
                        onChange={(e) =>
                            actions.onQuantityChange(
                                clampUnitQuantity(parseInt(e.target.value, 10))
                            )
                        }
                        className="h-8 w-20"
                    />
                </div>
                <Button
                    type="button"
                    variant={isEnemy ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={actions.onAddToEnemies}
                    disabled={isEnemy}
                >
                    {isEnemy ? t('alreadyEnemy') : t('toEnemies')}
                </Button>
            </div>
        </SetupEntityCard>
    );
}

export function UnitsListCard({
    units,
    entityStats,
    selection,
    actions,
}: UnitsListCardProps) {
    const t = useTranslations('battleSetup.units');

    const tGame = useTranslations('gameTerms.ungrouped');

    const locale = useLocale();

    const filter = useSetupUnitsFilter(units);

    if (units.length === 0) {
        return (
            <HudSection title={t('title')}>
                <p className="text-xs text-muted-foreground">
                    {t('hintEmpty')}
                </p>
                <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('empty')}
                </p>
            </HudSection>
        );
    }

    const byRace = filter.groups;

    const raceLabel = (key: string) => groupDisplayName(key, tGame('race'));

    const byLabel = (a: string, b: string) =>
        raceLabel(a).localeCompare(raceLabel(b), locale);

    const raceOrder = [...byRace.keys()].sort(byLabel);

    const chips = [...filter.chips].sort((a, b) => byLabel(a.key, b.key));

    return (
        <HudSection
            title={t('title')}
            className="mt-0 max-h-[600px] space-y-4 overflow-y-auto"
        >
            <p className="text-xs text-muted-foreground">{t('hint')}</p>
            <div className="space-y-2">
                <SearchInput
                    value={filter.query.value}
                    onChange={filter.query.set}
                    label={t('search')}
                />
                <HudChipTabs
                    ariaLabel={t('raceFilter')}
                    items={chips.map((chip) => ({
                        key: chip.key,
                        active: chip.active,
                        onSelect: () => filter.toggleRace(chip.key),
                        label: `${raceLabel(chip.key)} · ${chip.count}`,
                    }))}
                />
            </div>
            {raceOrder.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('noMatches')}
                </p>
            )}
            <Accordion
                key={raceOrder.join('|')}
                type="multiple"
                defaultValue={raceOrder}
                className="space-y-2"
            >
                {raceOrder.map((raceKey) => {
                    const raceUnits = byRace.get(raceKey) ?? [];

                    return (
                        <AccordionItem key={raceKey} value={raceKey}>
                            <AccordionTrigger className="py-3 text-sm">
                                {raceLabel(raceKey)} ({raceUnits.length})
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3">
                                {raceUnits.map((unit) => {
                                    const isSelected = selection.isSelected(
                                        unit.id
                                    );

                                    const side = selection.sideOf(unit.id);

                                    const quantity = selection.quantityOf(
                                        unit.id
                                    );

                                    return (
                                        <UnitRow
                                            key={unit.id}
                                            unit={unit}
                                            stats={entityStats?.[unit.id]}
                                            state={{
                                                isSelected,
                                                side,
                                                quantity,
                                            }}
                                            actions={{
                                                onToggle: () =>
                                                    actions.cycleUnit(unit.id),
                                                onAddToEnemies: () => {
                                                    if (
                                                        side !==
                                                        ParticipantSide.ENEMY
                                                    )
                                                        actions.addToSide(
                                                            unit.id,
                                                            ParticipantSourceType.UNIT,
                                                            ParticipantSide.ENEMY,
                                                            quantity
                                                        );
                                                },
                                                onQuantityChange: (value) =>
                                                    actions.setQuantity(
                                                        unit.id,
                                                        value
                                                    ),
                                            }}
                                        />
                                    );
                                })}
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </HudSection>
    );
}
