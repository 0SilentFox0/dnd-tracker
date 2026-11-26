'use client';

import { useTranslations } from 'next-intl';

import { GridTypeChoice } from '../shared/GridTypeChoice';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Label } from '@/components/ui/label';
import type { BattleMapEditor } from '@/lib/hooks/battles';
import { MAX_SIDE, MIN_SIDE } from '@/lib/utils/battle/grid';

export function GridSizeSection({ editor }: { editor: BattleMapEditor }) {
    const t = useTranslations('battleSetup.map');

    const { map, grid } = editor.state;

    const { actions } = editor;

    return (
        <div className="space-y-4">
            <GridTypeChoice value={grid} onChange={actions.setGridType} />
            <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                    <Label htmlFor="map-cols">{t('cols')}</Label>
                    <BoundedNumberInput
                        id="map-cols"
                        value={map.cols}
                        min={MIN_SIDE}
                        max={MAX_SIDE}
                        onCommit={(v) => actions.setSize(v, map.rows)}
                    />
                </div>
                <div className="min-w-0">
                    <Label htmlFor="map-rows">{t('rows')}</Label>
                    <BoundedNumberInput
                        id="map-rows"
                        value={map.rows}
                        min={MIN_SIDE}
                        max={MAX_SIDE}
                        onCommit={(v) => actions.setSize(map.cols, v)}
                    />
                </div>
            </div>
        </div>
    );
}
