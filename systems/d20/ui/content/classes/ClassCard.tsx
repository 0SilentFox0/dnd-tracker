'use client';

import { useTranslations } from 'next-intl';

import { DmEntityCard } from '@/components/common/entity/DmEntityCard';
import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { HudPill } from '@/components/hud/page';
import type { GameClassData } from '@/types/classes';

interface ClassCardProps {
    gameClass: GameClassData;
    campaignId: string;
    onDelete?: (classId: string) => void;
    canEdit?: boolean;
}

export function ClassCard({
    gameClass,
    campaignId,
    onDelete,
    canEdit = true,
}: ClassCardProps) {
    const t = useTranslations();

    return (
        <DmEntityCard
            href={`/campaigns/${campaignId}/dm/classes/${gameClass.id}`}
            title={gameClass.name}
            accent={gameClass.color ?? undefined}
            icon={gameClass.icon}
            onDelete={() => onDelete?.(gameClass.id)}
            canEdit={canEdit}
        >
            <HudPill>d{gameClass.hitDie}</HudPill>
            <HudPill>
                {t(`classes.casters.${gameClass.caster}`)}
            </HudPill>
            <HudPill>
                {t('classes.card.subclasses', {
                    count: gameClass.subclasses.length,
                })}
            </HudPill>
            {gameClass.subclasses.length > 0 && (
                <span className="flex basis-full flex-wrap gap-1">
                    {gameClass.subclasses.map((s) => (
                        <span
                            key={s.id}
                            title={s.name}
                            className="inline-flex items-center gap-1 rounded-sm bg-muted/50 px-1.5 py-1 text-xs"
                        >
                            <EntityIcon
                                src={s.icon}
                                name={s.name}
                                size={24}
                                alt={s.name}
                                className="size-6 rounded-sm text-xs"
                            />
                            <span>{s.name}</span>
                        </span>
                    ))}
                </span>
            )}
        </DmEntityCard>
    );
}
