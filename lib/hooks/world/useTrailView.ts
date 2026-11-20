'use client';

import { useEffect, useMemo, useState } from 'react';

import {
    buildTrails,
    type Trail,
    type TrailNode,
} from '@/lib/utils/world/trail';
import type { WorldSession, WorldTrailData } from '@/types/world';

const NO_SESSIONS: WorldSession[] = [];

export interface SelectedTrailNode {
    entryId: string;
    node: TrailNode;
    session: WorldSession | null;
}

function findSelected(
    selectedId: string | null,
    trails: Trail[],
    visible: ReadonlySet<string | null>,
    sessions: WorldSession[]
): SelectedTrailNode | null {
    if (!selectedId) return null;

    for (const trail of trails) {
        if (!visible.has(trail.sessionId)) continue;

        const session = sessions.find((s) => s.id === trail.sessionId) ?? null;

        const node = trail.nodes.find((n) => n.entryId === selectedId);

        if (node) return { entryId: selectedId, node, session };

        const seg = trail.segments.find((s) => s.entryId === selectedId);

        if (seg)
            return {
                entryId: selectedId,
                node: {
                    entryId: selectedId,
                    x: seg.to.x,
                    y: seg.to.y,
                    kind: 'travel',
                    at: '',
                    heroes: [],
                },
                session,
            };
    }

    return null;
}

export function useTrailView(data: WorldTrailData | undefined, aspect: number) {
    const entries = data?.entries;

    const sessions = data?.sessions ?? NO_SESSIONS;

    const trails = useMemo<Trail[]>(
        () => buildTrails(entries ?? [], aspect),
        [entries, aspect]
    );

    const [hidden, setHidden] = useState<ReadonlySet<string | null>>(new Set());

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const visible = useMemo<ReadonlySet<string | null>>(
        () =>
            new Set(
                trails.map((t) => t.sessionId).filter((id) => !hidden.has(id))
            ),
        [trails, hidden]
    );

    const selected = findSelected(selectedId, trails, visible, sessions);

    useEffect(() => {
        if (!selectedId) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedId(null);
        };

        const onDown = (e: PointerEvent) => {
            if (
                e.target instanceof Element &&
                e.target.closest('[data-trail-bubble],[data-trail-hit]')
            )
                return;

            setSelectedId(null);
        };

        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown);

        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown);
        };
    }, [selectedId]);

    return {
        trails,
        sessions,
        visible,
        toggle: (sessionId: string | null) =>
            setHidden((prev) => {
                const next = new Set(prev);

                if (next.has(sessionId)) next.delete(sessionId);
                else next.add(sessionId);

                return next;
            }),
        selected,
        select: setSelectedId,
        clear: () => setSelectedId(null),
    };
}
