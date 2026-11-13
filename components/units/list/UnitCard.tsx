'use client';

import { memo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { GripVertical, X } from 'lucide-react';

import { UnitQuickStatsEditor } from './UnitQuickStatsEditor';

import { AbilityFlowList } from '@/components/abilities/AbilityFlow';
import { MonsterStatblock } from '@/components/units/MonsterStatblock';
import { ZoomableEntityIcon } from '@/components/common/ZoomableEntityIcon';
import { HudCard } from '@/components/hud/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AttackType } from '@/lib/constants/battle';
import { challengeLabel } from '@/lib/constants/challenge';
import { useConfirm } from '@/lib/hooks/common';
import { signedDelta } from '@/lib/utils/common/format';
import { getUnitImmunities } from '@/lib/utils/races/race-effects';
import { unitDamageSummary } from '@/lib/utils/units/damage-summary';
import { UNIT_DRAG_TYPE, unitDragPayload } from '@/lib/utils/units/drag';
import type { Unit, UnitAttack } from '@/types/units';

function primaryAttackIndex(attacks: UnitAttack[]): number {
    if (!attacks.length) return -1;

    const meleeIdx = attacks.findIndex(
        (a) => (a as { type?: string }).type === AttackType.MELEE || !a.type
    );

    return meleeIdx >= 0 ? meleeIdx : 0;
}

interface UnitCardProps {
    unit: Unit;
    campaignId: string;
    onDelete?: (unitId: string) => void;
    canEdit?: boolean;
}

export const UnitCard = memo(function UnitCard({
    unit,
    campaignId,
    onDelete,
    canEdit = true,
}: UnitCardProps) {
    const t = useTranslations('units.card');

    const tActions = useTranslations('common.actions');

    const tg = useTranslations('gameTerms');

    const confirm = useConfirm();

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData(UNIT_DRAG_TYPE, unitDragPayload(unit));
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', unit.name);
    };

    const attacks: UnitAttack[] = Array.isArray(unit.attacks)
        ? unit.attacks
        : [];

    const abilitySummary = unit.abilitySummary ?? [];

    const allImmunities = getUnitImmunities(unit);

    const damage = unitDamageSummary(unit, attacks);

    const primaryIdx = primaryAttackIndex(attacks);

    const primaryAttack = primaryIdx >= 0 ? attacks[primaryIdx] : null;

    return (
        <HudCard
            href={
                canEdit
                    ? `/campaigns/${campaignId}/dm/units/${unit.id}`
                    : undefined
            }
            linkLabel={unit.name}
            className="group/card relative flex flex-col justify-between space-y-3"
        >
            <div
                draggable={canEdit}
                onDragStart={canEdit ? handleDragStart : undefined}
                className="absolute top-2 left-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                title={t('dragTitle')}
            >
                <GripVertical className="h-4 w-4" />
            </div>
            <div className="pl-5">
                <div className="flex items-start gap-3">
                    <ZoomableEntityIcon
                        src={unit.avatar}
                        name={unit.name}
                        size={128}
                        className="size-20 rounded-full text-2xl sm:size-24"
                    />
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-hud-ink">
                            {unit.name}
                            {unit.cr != null && (
                                <Badge
                                    variant="outline"
                                    className="ml-2 align-middle text-xs"
                                >
                                    {`CR ${challengeLabel(unit.cr)}`}
                                </Badge>
                            )}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <div>
                                {t('levelHp', {
                                    level: unit.level,
                                    hp: unit.maxHp,
                                })}
                                {damage && (
                                    <>
                                        {t('damage', {
                                            average: damage.average,
                                        })}
                                        <span className="text-xs whitespace-nowrap">
                                            ({damage.dice}
                                            {damage.mod !== 0 &&
                                                ` ${signedDelta(damage.mod)} ${tg(
                                                    `abilities.${damage.ability}.short`
                                                )}`}
                                            )
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {canEdit && (
                    <div className="mt-3 mb-3">
                        <UnitQuickStatsEditor
                            unit={unit}
                            campaignId={campaignId}
                            primaryAttackIndex={primaryIdx}
                            primaryAttackName={primaryAttack?.name}
                        />
                    </div>
                )}

                {unit.cr != null && unit.statblock && (
                    <MonsterStatblock block={unit.statblock} />
                )}

                {abilitySummary.length > 0 && (
                    <div className="mt-4 space-y-1">
                        <div className="text-xs font-semibold">
                            {t('abilities')}
                        </div>
                        <div className="text-muted-foreground">
                            <AbilityFlowList lines={abilitySummary} />
                        </div>
                    </div>
                )}

                {allImmunities.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold">
                            {t('immunities')}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {allImmunities.slice(0, 3).map((immunity, idx) => (
                                <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                >
                                    {immunity}
                                </Badge>
                            ))}
                            {allImmunities.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{allImmunities.length - 3}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {unit.knownSpells && unit.knownSpells.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-xs font-semibold">
                            {t('spells')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {t('spellCount', {
                                count: unit.knownSpells.length,
                            })}
                        </div>
                    </div>
                )}
            </div>

            {canEdit && (
                <div className="flex gap-2 pl-5">
                    <Link
                        href={`/campaigns/${campaignId}/dm/units/${unit.id}`}
                        className="flex-1"
                    >
                        <Button variant="outline" size="sm" className="w-full">
                            {tActions('edit')}
                        </Button>
                    </Link>
                    <Button
                        variant="destructive"
                        size="sm"
                        aria-label={t('deleteLabel', { name: unit.name })}
                        onClick={async () => {
                            if (
                                await confirm({
                                    title: t('deleteTitle', {
                                        name: unit.name,
                                    }),
                                    confirmLabel: tActions('delete'),
                                    destructive: true,
                                })
                            )
                                onDelete?.(unit.id);
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </HudCard>
    );
});
