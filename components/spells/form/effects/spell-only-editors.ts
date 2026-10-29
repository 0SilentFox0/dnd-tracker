import type { ComponentType } from "react";

import { AnchoredZoneEditor } from "./editors/AnchoredZoneEditor";
import { ChooseOneEditor } from "./editors/ChooseOneEditor";
import { CreateTerrainEditor } from "./editors/CreateTerrainEditor";
import { GrantCastEditor } from "./editors/GrantCastEditor";
import { HitRiderEditor } from "./editors/HitRiderEditor";
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
  hitRider: HitRiderEditor,
  grantCast: GrantCastEditor,
  anchoredZone: AnchoredZoneEditor,
};
