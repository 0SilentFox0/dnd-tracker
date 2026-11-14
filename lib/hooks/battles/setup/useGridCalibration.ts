'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { BattleMapEditor } from './useBattleMapEditor';

import { useConfirm } from '@/lib/hooks/common';
import {
    fromCellRect,
    type GridCalibration,
    nudge,
    type NudgeUnit,
    type PixelRect,
} from '@/lib/utils/battle/grid';

export type CalibrationMode = 'off' | 'rect';

interface Point {
    x: number;
    y: number;
}

const MIN_DRAFT_PX = 4;

const DEFAULT_PREVIEW_OPACITY = 0.6;

const rectOf = (a: Point, b: Point): PixelRect => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
});

/** Ручне калібрування сітки: обвести клітинку (або N×N) на зображенні, точний нуджинг, вибір «зберегти калібрування» при заміні фону. */
export function useGridCalibration(editor: BattleMapEditor) {
    const t = useTranslations('battleSetup.map.calibration');

    const confirm = useConfirm();

    const { map, image, cellPx, pendingKeep } = editor.state;

    const {
        applyCalibration,
        setGridOffset,
        keepCalibration,
        dropCalibration,
    } = editor.actions;

    const [mode, setMode] = useState<CalibrationMode>('off');

    const [n, setN] = useState(1);

    const [previewOpacity, setPreviewOpacity] = useState(
        DEFAULT_PREVIEW_OPACITY
    );

    const [anchor, setAnchor] = useState<Point | null>(null);

    const [cursor, setCursor] = useState<Point | null>(null);

    const draft = useMemo(
        () => (anchor && cursor ? rectOf(anchor, cursor) : null),
        [anchor, cursor]
    );

    const preview = useMemo<GridCalibration | null>(
        () =>
            image && draft && draft.w >= MIN_DRAFT_PX && draft.h >= MIN_DRAFT_PX
                ? fromCellRect(image, draft, n)
                : null,
        [image, draft, n]
    );

    const reset = useCallback(() => {
        setAnchor(null);
        setCursor(null);
    }, []);

    const start = useCallback(() => {
        reset();
        setMode('rect');
    }, [reset]);

    const cancel = useCallback(() => {
        reset();
        setMode('off');
    }, [reset]);

    const press = useCallback((p: Point) => {
        setAnchor(p);
        setCursor(p);
    }, []);

    const drag = useCallback((p: Point) => setCursor(p), []);

    const commit = useCallback(() => {
        if (!preview) return;

        applyCalibration(preview);
        cancel();
    }, [preview, applyCalibration, cancel]);

    const move = useCallback(
        (dx: number, dy: number, unit: NudgeUnit) => {
            if (cellPx === null) return;

            setGridOffset(nudge(map, dx, dy, unit, cellPx).gridOffset);
        },
        [map, cellPx, setGridOffset]
    );

    useEffect(() => {
        if (!pendingKeep) return;

        const abort = new AbortController();

        confirm({
            title: t('keepTitle'),
            description: t('keepDescription'),
            confirmLabel: t('keep'),
            cancelLabel: t('reset'),
            signal: abort.signal,
        }).then((ok) => {
            if (abort.signal.aborted) return;

            if (ok) keepCalibration();
            else dropCalibration();
        });

        return () => abort.abort();
    }, [pendingKeep, confirm, t, keepCalibration, dropCalibration]);

    return {
        state: {
            mode,
            n,
            previewOpacity,
            image,
            draft,
            preview,
            canNudge: cellPx !== null,
        },
        actions: {
            start,
            cancel,
            setN,
            setPreviewOpacity,
            press,
            drag,
            commit,
            nudge: move,
        },
    };
}

export type GridCalibrationController = ReturnType<typeof useGridCalibration>;
