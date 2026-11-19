'use client';

import { useTranslations } from 'next-intl';

import type { MapModeUi } from '../types';
import { MazeDarkScreen } from './layers/MazeDarkScreen';
import { MazeFeaturesLayer } from './layers/MazeFeaturesLayer';
import { MazeFogOfWar } from './layers/MazeFogOfWar';
import { MazeWallsLayer } from './layers/MazeWallsLayer';
import { MazeEdgeEditor } from './tools/MazeEdgeEditor';
import { MazeMarkPicker } from './tools/MazeMarkPicker';
import { MazeEditPalette, MazeToolbar } from './tools/MazeToolbar';
import { MazePartyVision } from './view/MazePartyVision';
import { MazeViewerSwitch } from './view/MazeViewerSwitch';
import {
    MazeToolStateProvider,
    MazeViewProvider,
} from './view/MazeViewProvider';

import { ToggleRow } from '@/components/battle/setup/form/ToggleRow';
import type { MazeTools } from '@/lib/hooks/battle/modes/maze';
import type { MazeView } from '@/lib/utils/battle/modes/maze';

function MazeSetupToggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    const t = useTranslations('battleDm.maze');

    return (
        <ToggleRow
            id="map-maze"
            label={t('title')}
            checked={checked}
            onChange={onChange}
        />
    );
}

export const MAZE_UI: MapModeUi = {
    MapLayers: ({ map, view, rotated, editing }) => {
        const maze = view as MazeView | null;

        const tools = editing as MazeTools | null;

        return (
            <>
                <MazeFeaturesLayer map={map} view={maze} rotated={rotated} />
                <MazeFogOfWar map={map} view={maze} />
                <MazePartyVision view={maze} />
                <MazeWallsLayer map={map} view={maze} />
                {tools?.editing && (
                    <MazeEdgeEditor map={map} editing={tools.editing} />
                )}
            </>
        );
    },
    MapOverlay: ({ view, participants }) => (
        <>
            {view?.dark && (
                <MazeDarkScreen
                    own={participants.filter((p) =>
                        view.ownIds.has(p.basicInfo.id)
                    )}
                />
            )}
            <MazeViewerSwitch />
        </>
    ),
    Toolbar: ({ tools, tall }) => (
        <MazeToolbar tools={tools as MazeTools} tall={tall} />
    ),
    EditPalette: ({ tools }) => <MazeEditPalette tools={tools as MazeTools} />,
    TurnControls: MazeMarkPicker,
    SetupToggle: MazeSetupToggle,
    SceneProvider: ({ children }) => (
        <MazeViewProvider>
            <MazeToolStateProvider>{children}</MazeToolStateProvider>
        </MazeViewProvider>
    ),
    hidesTerrain: true,
};
