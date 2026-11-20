'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, X } from 'lucide-react';

import { MARKER_ICON } from './marker-icons';

import { HudButton, HudIconButton } from '@/components/hud';
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
}

export function MarkerBubble({ marker, actions, children }: MarkerBubbleProps) {
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
            className="w-64 max-w-full rounded-lg border border-hud-rule bg-black/90 p-3 text-sm text-hud-ink shadow-lg"
        >
            <div className="flex items-start gap-2">
                {children ?? (
                    <>
                        <Icon className="mt-0.5 size-4 shrink-0 text-hud-gold-bright" />
                        <div className="min-w-0 flex-1">
                            <p className="font-medium break-words">
                                {marker.name}
                            </p>
                            {marker.description ? (
                                <p className="mt-1 line-clamp-4 text-xs break-words text-hud-muted">
                                    {marker.description}
                                </p>
                            ) : null}
                        </div>
                    </>
                )}
                <HudIconButton
                    size="sm"
                    tone="muted"
                    aria-label={t('close')}
                    className="-mt-1 -mr-1 shrink-0"
                    onClick={actions.onClose}
                >
                    <X className="size-4" />
                </HudIconButton>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                <HudButton
                    data-tour="world.more"
                    className="text-xs text-hud-gold-bright underline"
                    onClick={actions.onMore}
                >
                    {t('more')}
                </HudButton>
                {actions.onOpenMap ? (
                    <HudButton
                        className="text-xs text-hud-gold-bright underline"
                        onClick={actions.onOpenMap}
                    >
                        {t('openMap')}
                    </HudButton>
                ) : null}
            </div>
        </div>
    );
}
