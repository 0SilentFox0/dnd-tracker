'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { WORLD_NO_SESSION_COLOR } from '@/lib/constants/world';
import type { Trail } from '@/lib/utils/world/trail';
import type { WorldSession } from '@/types/world';

export interface WorldTrailsProps {
    trails: Trail[];
    sessions: WorldSession[];
    visible: ReadonlySet<string | null>;
    zoom: number;
    selectedEntryId?: string | null;
    onSelect(entryId: string): void;
}

const NODE_PX = 10;

const LAST_NODE_PX = 15;

const stop = (e: { stopPropagation(): void }) => e.stopPropagation();

export function WorldTrails({
    trails,
    sessions,
    visible,
    zoom,
    selectedEntryId,
    onSelect,
}: WorldTrailsProps) {
    const t = useTranslations('world');

    const shown = trails.filter((tr) => visible.has(tr.sessionId));

    if (shown.length === 0) return null;

    const styleOf = (sessionId: string | null) => {
        const session = sessions.find((s) => s.id === sessionId);

        return {
            color: session?.color ?? WORLD_NO_SESSION_COLOR,
            name: session?.name ?? t('trail.noSession'),
        };
    };

    return (
        <>
            <svg
                data-testid="world-trails"
                className="pointer-events-none absolute inset-0 size-full"
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
            >
                {shown.map((trail) => {
                    const { color, name } = styleOf(trail.sessionId);

                    return trail.segments.map((seg) => (
                        <g key={seg.entryId} data-testid="trail-segment">
                            <line
                                x1={seg.from.x}
                                y1={seg.from.y}
                                x2={seg.to.x}
                                y2={seg.to.y}
                                stroke={color}
                                strokeWidth={
                                    seg.entryId === selectedEntryId ? 4 : 2.5
                                }
                                strokeLinecap="round"
                                strokeDasharray="6 4"
                                opacity={0.9}
                                style={{ vectorEffect: 'non-scaling-stroke' }}
                            />
                            <line
                                data-trail-hit
                                role="button"
                                tabIndex={0}
                                aria-label={t('trail.segment', {
                                    session: name,
                                })}
                                x1={seg.from.x}
                                y1={seg.from.y}
                                x2={seg.to.x}
                                y2={seg.to.y}
                                stroke="transparent"
                                strokeWidth={14}
                                style={{
                                    vectorEffect: 'non-scaling-stroke',
                                    pointerEvents: 'stroke',
                                    cursor: 'pointer',
                                }}
                                onPointerDown={stop}
                                onPointerUp={stop}
                                onClick={() => onSelect(seg.entryId)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ')
                                        onSelect(seg.entryId);
                                }}
                            />
                        </g>
                    ));
                })}
            </svg>
            {shown.map((trail) => {
                const { color, name } = styleOf(trail.sessionId);

                return trail.nodes.map((node, i) => {
                    const last = i === trail.nodes.length - 1;

                    const px = last ? LAST_NODE_PX : NODE_PX;

                    return (
                        <HudButton
                            key={node.entryId}
                            type="button"
                            data-trail-hit
                            data-last={last}
                            data-selected={node.entryId === selectedEntryId}
                            aria-label={t('trail.node', {
                                session: name,
                                kind: t(`travel.kinds.${node.kind}`),
                            })}
                            className="pointer-events-auto absolute rounded-full border-2 border-black/70"
                            style={{
                                left: `${node.x * 100}%`,
                                top: `${node.y * 100}%`,
                                width: px,
                                height: px,
                                background: color,
                                boxShadow: last
                                    ? `0 0 0 2px #fff, 0 0 8px 2px ${color}`
                                    : undefined,
                                transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                            }}
                            onPointerDown={stop}
                            onPointerUp={stop}
                            onClick={() => onSelect(node.entryId)}
                        />
                    );
                });
            })}
        </>
    );
}
