import { useCallback, useEffect, useMemo, useState } from 'react';

import type { BattleMapEditor } from '@/lib/hooks/battles/setup/useBattleMapEditor';
import {
    type BattleMapSection,
    battleMapSections,
    type BattleMapSectionState,
    sectionOfTool,
} from '@/lib/utils/battle/grid/map-sections';

interface Flags {
    touch: boolean;
    hasModes: boolean;
    hidesTerrain: boolean;
}

export function useBattleMapSections(editor: BattleMapEditor, flags: Flags) {
    const { touch, hasModes, hidesTerrain } = flags;

    const hasMotion = !!editor.motionTool;

    const [selected, setActive] = useState<BattleMapSection>('grid');

    const list = useMemo<BattleMapSectionState[]>(
        () =>
            battleMapSections({
                touch,
                hidesTerrain,
                hasModes,
                hasMotion,
            }),
        [touch, hidesTerrain, hasModes, hasMotion]
    );

    const active: BattleMapSection =
        list.find((s) => s.id === selected)?.status === 'hidden'
            ? 'grid'
            : selected;

    const { tool } = editor.state;

    const { setTool } = editor.actions;

    const select = useCallback(
        (id: BattleMapSection) => {
            if (tool && sectionOfTool(tool) !== id) setTool(null);

            setActive(id);
        },
        [tool, setTool]
    );

    useEffect(() => {
        const current = list.find((s) => s.id === active);

        if (
            current?.status === 'disabled' &&
            tool &&
            sectionOfTool(tool) === active
        ) {
            setTool(null);
        }
    }, [list, active, tool, setTool]);

    return { list, active, select };
}

export type BattleMapSections = ReturnType<typeof useBattleMapSections>;
