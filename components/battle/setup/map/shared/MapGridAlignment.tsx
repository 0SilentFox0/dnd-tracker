'use client';

import { useTranslations } from 'next-intl';

import { GridCalibration } from './GridCalibration';
import { RangeRow } from './RangeRow';

import type { BattleMapEditor } from '@/lib/hooks/battles';
import {
    MAX_CELL_PX,
    MAX_GRID_OFFSET,
    MIN_CELL_PX,
} from '@/lib/utils/battle/grid';

export function MapGridAlignment({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    const { map, cellPx } = editor.state;

    const { actions } = editor;

    const offset = map.gridOffset ?? { x: 0, y: 0 };

    const percent = (v: number) => `${Math.round(v * 100)}%`;

    return (
        <div className="space-y-4">
            <RangeRow
                id="map-cell-size"
                label={t('cellSize', {
                    size: cellPx === null ? '…' : `${cellPx} px`,
                    cols: map.cols,
                    rows: map.rows,
                })}
                value={cellPx ?? MIN_CELL_PX}
                range={{
                    min: MIN_CELL_PX,
                    max: MAX_CELL_PX,
                    step: 1,
                    disabled: cellPx === null,
                }}
                onChange={actions.setCellSize}
            />
            <div className="grid grid-cols-2 gap-3">
                <RangeRow
                    id="map-offset-x"
                    label={t('offsetX', { value: percent(offset.x) })}
                    value={offset.x}
                    range={{ min: 0, max: MAX_GRID_OFFSET, step: 0.01 }}
                    onChange={(x) => actions.setGridOffset({ ...offset, x })}
                />
                <RangeRow
                    id="map-offset-y"
                    label={t('offsetY', { value: percent(offset.y) })}
                    value={offset.y}
                    range={{ min: 0, max: MAX_GRID_OFFSET, step: 0.01 }}
                    onChange={(y) => actions.setGridOffset({ ...offset, y })}
                />
            </div>
            <GridCalibration editor={editor} />
        </div>
    );
}
