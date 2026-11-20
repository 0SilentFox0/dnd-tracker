'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import { HudIconButton } from '@/components/hud';
import { WORLD_NO_SESSION_COLOR } from '@/lib/constants/world';
import type { SelectedTrailNode } from '@/lib/hooks/world';
import { cn } from '@/lib/utils';

interface TrailBubbleProps {
    selected: SelectedTrailNode;
    onClose(): void;
    embedded?: boolean;
}

export function TrailBubble({
    selected,
    onClose,
    embedded = false,
}: TrailBubbleProps) {
    const t = useTranslations('world');

    const format = useFormatter();

    const { node, session } = selected;

    const name = session?.name ?? t('trail.noSession');

    const description =
        session &&
        'description' in session &&
        typeof session.description === 'string'
            ? session.description
            : null;

    return (
        <div
            role="dialog"
            aria-label={name}
            data-trail-bubble
            className={cn(
                'text-sm text-hud-ink',
                embedded
                    ? 'w-full'
                    : 'w-64 max-w-full rounded-lg border border-hud-rule bg-black/90 p-3 shadow-lg'
            )}
        >
            <div className="flex items-start gap-2">
                <span
                    aria-hidden
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{
                        background: session?.color ?? WORLD_NO_SESSION_COLOR,
                    }}
                />
                <p className="min-w-0 flex-1 font-medium break-words">{name}</p>
                {embedded ? null : (
                    <HudIconButton
                        size="sm"
                        tone="muted"
                        aria-label={t('bubble.close')}
                        className="-mt-1 -mr-1 shrink-0"
                        onClick={onClose}
                    >
                        <X className="size-4" />
                    </HudIconButton>
                )}
            </div>
            {description ? (
                <p className="mt-1 line-clamp-4 text-xs break-words text-hud-muted">
                    {description}
                </p>
            ) : null}
            <dl className="mt-2 space-y-1 text-xs">
                <div className="flex gap-1">
                    <dt className="text-hud-muted">{t('trail.step')}:</dt>
                    <dd>{t(`travel.kinds.${node.kind}`)}</dd>
                </div>
                {node.at ? (
                    <div className="flex gap-1">
                        <dt className="text-hud-muted">{t('trail.date')}:</dt>
                        <dd>
                            {format.dateTime(new Date(node.at), {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                            })}
                        </dd>
                    </div>
                ) : null}
                {node.heroes.length > 0 ? (
                    <div className="flex gap-1">
                        <dt className="text-hud-muted">{t('trail.heroes')}:</dt>
                        <dd className="break-words">
                            {node.heroes.map((h) => h.name).join(', ')}
                        </dd>
                    </div>
                ) : null}
            </dl>
        </div>
    );
}
