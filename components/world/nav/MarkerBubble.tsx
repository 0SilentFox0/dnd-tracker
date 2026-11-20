'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { FolderOpen, MapPin, PanelRight, X } from 'lucide-react';

import { HudButton, HudIconButton } from '@/components/hud';
import { MARKER_ICON } from '@/components/world/marker-icons';
import {
    BUBBLE_ACTIONS,
    bubbleButton,
} from '@/components/world/nav/bubble-button';
import { cn } from '@/lib/utils';
import type { WorldMarker } from '@/types/world';

interface MarkerBubbleProps {
    marker: Pick<
        WorldMarker,
        'name' | 'description' | 'icon' | 'kind' | 'childMapId'
    >;
    actions: {
        onMore(): void;
        onOpenMap?(): void;
        onClose(): void;
    };
    children?: ReactNode;
    embedded?: boolean;
}

export function MarkerBubble({
    marker,
    actions,
    children,
    embedded = false,
}: MarkerBubbleProps) {
    const t = useTranslations('world.bubble');

    const Icon = (marker.icon && MARKER_ICON[marker.icon]) || MapPin;

    return (
        <div
            role="dialog"
            aria-label={marker.name}
            onKeyDown={(e) => {
                if (e.key !== 'Escape') return;

                e.preventDefault();
                actions.onClose();
            }}
            data-tour="world.bubble"
            className={cn(
                'text-sm text-hud-ink',
                embedded
                    ? 'w-full'
                    : 'w-64 max-w-full rounded-lg border border-hud-rule bg-black/90 p-3 shadow-lg'
            )}
        >
            <div className="flex items-start gap-2">
                {children ?? (
                    <>
                        <Icon className="mt-0.5 size-4 shrink-0 text-hud-gold-bright" />
                        <div className="min-w-0 flex-1">
                            {embedded ? null : (
                                <p className="font-medium break-words">
                                    {marker.name}
                                </p>
                            )}
                            {marker.description ? (
                                <p className="mt-1 line-clamp-4 text-xs break-words text-hud-muted">
                                    {marker.description}
                                </p>
                            ) : null}
                        </div>
                    </>
                )}
                {embedded ? null : (
                    <HudIconButton
                        size="sm"
                        tone="muted"
                        aria-label={t('close')}
                        className="-mt-1 -mr-1 shrink-0"
                        onClick={actions.onClose}
                    >
                        <X className="size-4" />
                    </HudIconButton>
                )}
            </div>
            <div className={cn('mt-2', BUBBLE_ACTIONS)}>
                <HudButton
                    data-tour="world.more"
                    className={bubbleButton()}
                    onClick={actions.onMore}
                >
                    <PanelRight className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{t('more')}</span>
                </HudButton>
                {actions.onOpenMap ? (
                    <HudButton
                        className={bubbleButton()}
                        onClick={actions.onOpenMap}
                    >
                        <FolderOpen className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{t('openMap')}</span>
                    </HudButton>
                ) : null}
            </div>
        </div>
    );
}
