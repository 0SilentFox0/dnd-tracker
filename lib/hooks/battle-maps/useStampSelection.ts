'use client';

import { useCallback, useRef } from 'react';

import type { EditorStamps } from './useMapArtEditor';

import { stampDef, type StampDef, type StampLayer } from '@/lib/constants/map-art/stamps';
import { stampBox, toStampLocal } from '@/lib/utils/battle/map-art/stamp-geometry';
import { alphaHit, type AlphaMask, buildAlphaMask } from '@/lib/utils/canvas/map-art/alpha-mask';
import { loadedImage } from '@/lib/utils/canvas/map-art/assets';
import { orderedStamps } from '@/lib/utils/canvas/map-art/paint-stamps';
import type { MapArtStamp } from '@/types/battle-map';

type Point = { x: number; y: number };

type Mods = { shiftKey?: boolean };

const PICK_ORDER: readonly StampLayer[] = ['canopy', 'object', 'decal'];

const ROT_STEP = 15;

const WHEEL_STEP = 1.1;

export function pickStamp(
    stamps: readonly MapArtStamp[],
    at: Point,
    masks: (asset: string) => AlphaMask | null,
    lookup: (id: string) => StampDef | undefined = stampDef
): string | null {
    for (const layer of PICK_ORDER) {
        const ordered = orderedStamps(stamps, layer, lookup).reverse();

        for (const { s, def } of ordered) {
            const { u, v } = toStampLocal(stampBox(s, def), at);

            const mu = s.flip ? 1 - u : u;

            if (mu < 0 || mu > 1 || v < 0 || v > 1) continue;

            if (alphaHit(masks(s.asset), mu, v)) return s.id;
        }
    }

    return null;
}

const isTyping = (target: EventTarget | null): boolean => {
    const el = target as HTMLElement | null;

    return (
        !!el &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
            el.isContentEditable === true)
    );
};

export function useStampSelection({
    stamps,
    api,
    masks,
}: {
    stamps: MapArtStamp[];
    api: EditorStamps;
    masks?: (asset: string) => AlphaMask | null;
}) {
    const cache = useRef(new Map<string, AlphaMask | null>());

    const maskOf = useCallback(
        (asset: string): AlphaMask | null => {
            if (masks) return masks(asset);

            const file = stampDef(asset)?.file;

            const img = file ? loadedImage(file) : undefined;

            if (!file || !img) return null;

            if (!cache.current.has(file))
                cache.current.set(file, buildAlphaMask(img));

            return cache.current.get(file) ?? null;
        },
        [masks]
    );

    const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

    const scaleStart = useRef<{ id: string; dist: number; scale: number } | null>(
        null
    );

    const current = () => stamps.find((s) => s.id === api.selectedId);

    const onPointerDown = (at: Point) => {
        scaleStart.current = null;

        const id = pickStamp(stamps, at, maskOf);

        api.select(id);

        const hit = stamps.find((s) => s.id === id);

        drag.current = hit ? { id: hit.id, dx: hit.x - at.x, dy: hit.y - at.y } : null;
    };

    const onPointerMove = (at: Point) => {
        const d = drag.current;

        if (d) api.update(d.id, { x: at.x + d.dx, y: at.y + d.dy }, `stamp-move:${d.id}`);
    };

    const onPointerUp = () => {
        drag.current = null;
        scaleStart.current = null;
    };

    const onRotateHandle = (at: Point, mods: Mods = {}) => {
        const s = current();

        if (!s) return;

        let rot = (Math.atan2(at.y - s.y, at.x - s.x) * 180) / Math.PI + 90;

        if (mods.shiftKey) rot = Math.round(rot / ROT_STEP) * ROT_STEP;

        api.update(s.id, { rot }, `stamp-rot:${s.id}`);
    };

    const onScaleHandle = (at: Point) => {
        const s = current();

        if (!s) return;

        const dist = Math.hypot(at.x - s.x, at.y - s.y);

        if (scaleStart.current?.id !== s.id)
            scaleStart.current = { id: s.id, dist: dist || 1, scale: s.scale };

        const start = scaleStart.current;

        api.update(
            s.id,
            { scale: start.scale * (dist / start.dist) },
            `stamp-scale:${s.id}`
        );
    };

    const onWheel = (deltaY: number) => {
        const s = current();

        if (!s || deltaY === 0) return;

        api.update(s.id, {
            scale: s.scale * WHEEL_STEP ** (deltaY < 0 ? 1 : -1),
        });
    };

    const onKey = (e: KeyboardEvent): boolean => {
        if (isTyping(e.target)) return false;

        const key = e.key.toLowerCase();

        const s = current();

        const done = () => {
            e.preventDefault();

            return true;
        };

        if (key === 'r' && !e.metaKey && !e.ctrlKey) {
            const dir = e.shiftKey ? -1 : 1;

            if (s) api.update(s.id, { rot: s.rot + dir * ROT_STEP });
            else api.rotateGhost(dir);

            return done();
        }

        if (key === 'f' && !e.metaKey && !e.ctrlKey) {
            if (s) api.update(s.id, { flip: !s.flip });
            else api.flipGhost();

            return done();
        }

        if (!s) return false;

        if (key === 'delete' || key === 'backspace') {
            api.remove(s.id);

            return done();
        }

        if (key === 'd' && (e.metaKey || e.ctrlKey)) {
            api.duplicate(s.id);

            return done();
        }

        if (key === '[' || key === ']') {
            api.reorder(s.id, key === ']' ? 1 : -1);

            return done();
        }

        return false;
    };

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onRotateHandle,
        onScaleHandle,
        onWheel,
        onKey,
    };
}
