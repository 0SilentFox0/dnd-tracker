import type { ComponentType } from "react";

import { ChooseOneEditor } from "./editors/ChooseOneEditor";
import { CreateTerrainEditor } from "./editors/CreateTerrainEditor";
import { InputDiceEditor } from "./editors/InputDiceEditor";
import { MoveSelfEditor } from "./editors/MoveSelfEditor";
import { TransformEditor } from "./editors/TransformEditor";
import type { SpellOnlyEditorProps } from "./spell-only-types";

import type { SpellOnlyKind } from "@/lib/utils/spells/editor/spell-only";

type EditorMap = { [K in SpellOnlyKind]?: ComponentType<SpellOnlyEditorProps<K>> };

export const SPELL_ONLY_EDITORS: EditorMap = {
  chooseOne: ChooseOneEditor,
  inputDice: InputDiceEditor,
  moveSelf: MoveSelfEditor,
  createTerrain: CreateTerrainEditor,
  transform: TransformEditor,
};
