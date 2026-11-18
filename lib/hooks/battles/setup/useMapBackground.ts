import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';

import type { GridCalibration, ImageSize } from '@/lib/utils/battle/grid';
import type { BattleMapConfig } from '@/types/battle-grid';

interface KeptCalibration {
    size: ImageSize;
    calibration: Partial<GridCalibration>;
}

export function useMapBackground({
    map,
    setMap,
    image,
}: {
    map: BattleMapConfig;
    setMap: Dispatch<SetStateAction<BattleMapConfig>>;
    image: ImageSize | null;
}) {
    const [kept, setKept] = useState<KeptCalibration | null>(null);

    // масштаб і зсув належать старому фону; той самий розмір нового зображення дає вибір їх зберегти
    const setBackground = useCallback(
        (background: string | null) => {
            const { backgroundCols, backgroundRows, gridOffset } = map;

            const calibration = { backgroundCols, backgroundRows, gridOffset };

            setKept(
                image && Object.values(calibration).some(Boolean)
                    ? { size: image, calibration }
                    : null
            );
            setMap(
                ({
                    backgroundCols: _cols,
                    backgroundRows: _rows,
                    gridOffset: _offset,
                    ...m
                }) => ({ ...m, background })
            );
        },
        [map, image, setMap]
    );

    const replaceBackground = useCallback(
        (background: string | null) => setMap((m) => ({ ...m, background })),
        [setMap]
    );

    const pendingKeep =
        kept &&
        image &&
        image.width === kept.size.width &&
        image.height === kept.size.height
            ? kept.calibration
            : null;

    const keepCalibration = useCallback(() => {
        if (pendingKeep) setMap((m) => ({ ...m, ...pendingKeep }));

        setKept(null);
    }, [pendingKeep, setMap]);

    const dropCalibration = useCallback(() => setKept(null), []);

    return {
        setBackground,
        replaceBackground,
        pendingKeep,
        keepCalibration,
        dropCalibration,
    };
}
