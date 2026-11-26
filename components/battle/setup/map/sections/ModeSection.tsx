'use client';

import { MAP_MODE_UI, type MapModeUi } from '@/components/battle/modes';
import type { BattleMapEditor } from '@/lib/hooks/battles';
import type { MapModeKey } from '@/lib/utils/battle/modes';

const MODE_ENTRIES = Object.entries(MAP_MODE_UI) as [MapModeKey, MapModeUi][];

export function useMapModeFlags(editor: BattleMapEditor) {
    const { mode, modeSupported } = editor.state;

    return {
        hasModes: MODE_ENTRIES.some(
            ([key, { SetupToggle }]) => SetupToggle && modeSupported(key)
        ),
        hidesTerrain: !!mode && !!MAP_MODE_UI[mode].hidesTerrain,
    };
}

export function ModeSection({ editor }: { editor: BattleMapEditor }) {
    const { mode, modeSupported } = editor.state;

    return (
        <div className="space-y-3">
            {MODE_ENTRIES.map(
                ([key, { SetupToggle }]) =>
                    SetupToggle &&
                    modeSupported(key) && (
                        <SetupToggle
                            key={key}
                            checked={mode === key}
                            onChange={(on) => editor.actions.setMode(key, on)}
                        />
                    )
            )}
        </div>
    );
}
