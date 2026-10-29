"use client";

import { useTranslations } from "next-intl";

import type { MapModeUi } from "../types";
import { MazeDarkScreen } from "./MazeDarkScreen";
import { MazeEdgeEditor } from "./MazeEdgeEditor";
import { MazeFeaturesLayer } from "./MazeFeaturesLayer";
import { MazeFogOfWar } from "./MazeFogOfWar";
import { MazeMarkPicker } from "./MazeMarkPicker";
import { MazePartyVision } from "./MazePartyVision";
import { MazeEditPalette, MazeToolbar } from "./MazeToolbar";
import { MazeToolStateProvider, MazeViewProvider } from "./MazeViewProvider";
import { MazeWallsLayer } from "./MazeWallsLayer";

import { ToggleRow } from "@/components/battle/setup/ToggleRow";
import type { MazeTools } from "@/lib/hooks/battle/modes/maze";
import type { MazeView } from "@/lib/utils/battle/modes/maze";

function MazeSetupToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const t = useTranslations("battleDm.maze");

  return <ToggleRow id="map-maze" label={t("title")} checked={checked} onChange={onChange} />;
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
        {tools?.editing && <MazeEdgeEditor map={map} editing={tools.editing} />}
      </>
    );
  },
  MapOverlay: ({ view, participants }) => (view?.dark ? <MazeDarkScreen own={participants.filter((p) => view.ownIds.has(p.basicInfo.id))} /> : null),
  Toolbar: ({ tools, tall }) => <MazeToolbar tools={tools as MazeTools} tall={tall} />,
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
