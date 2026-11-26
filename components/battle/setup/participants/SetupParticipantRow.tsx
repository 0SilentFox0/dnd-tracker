'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeftRight, Eye, EyeOff, Minus, Plus, X } from 'lucide-react';

import { EntityIcon } from '@/components/common/entity/EntityIcon';
import { Button } from '@/components/ui/button';
import { ParticipantSide } from '@/lib/constants/battle';
import { cn } from '@/lib/utils';

interface SetupParticipantRowProps {
    name: string;
    avatar: string | null;
    quantity?: number;
    side: ParticipantSide;
    reserved: number;
    actions: {
        onMoveToOtherSide: () => void;
        onRemove: () => void;
        onReserveChange: (reserved: number) => void;
    };
}

export function SetupParticipantRow({
    name,
    avatar,
    quantity,
    side,
    reserved,
    actions,
}: SetupParticipantRowProps) {
    const t = useTranslations('battleSetup.participant');

    const isAlly = side === ParticipantSide.ALLY;

    return (
        <div
            className={cn(
                'relative flex min-w-0 items-center justify-between gap-2 rounded-lg bg-hud-panel-2 py-1.5 pr-1.5 pl-3',
                reserved > 0 && 'opacity-60'
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'absolute inset-y-1.5 left-0 w-[3px] rounded-full',
                    isAlly ? 'bg-hud-accent' : 'bg-hud-crimson'
                )}
            />
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <EntityIcon
                    src={avatar}
                    name={name}
                    alt=""
                    size={32}
                    className="size-8 rounded-md"
                />
                <span className="truncate text-sm font-medium">{name}</span>
                {quantity != null && quantity > 1 && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                        ×{quantity}
                    </span>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
                {reserved > 0 && (quantity ?? 1) > 1 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={t('reserveLess')}
                            onClick={() =>
                                actions.onReserveChange(reserved - 1)
                            }
                        >
                            <Minus className="size-3" />
                        </Button>
                        {t('reserved', { count: reserved })}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={t('reserveMore')}
                            onClick={() =>
                                actions.onReserveChange(reserved + 1)
                            }
                        >
                            <Plus className="size-3" />
                        </Button>
                    </span>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={reserved > 0}
                    title={reserved > 0 ? t('unreserve') : t('reserve')}
                    onClick={() =>
                        actions.onReserveChange(
                            reserved > 0 ? 0 : (quantity ?? 1)
                        )
                    }
                >
                    {reserved > 0 ? (
                        <EyeOff className="size-4" />
                    ) : (
                        <Eye className="size-4" />
                    )}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={actions.onMoveToOtherSide}
                    title={isAlly ? t('moveToEnemies') : t('moveToAllies')}
                    aria-label={isAlly ? t('moveToEnemies') : t('moveToAllies')}
                >
                    <ArrowLeftRight className="size-4" aria-hidden />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={actions.onRemove}
                    title={t('remove')}
                    aria-label={t('remove')}
                >
                    <X className="size-4" aria-hidden />
                </Button>
            </div>
        </div>
    );
}
